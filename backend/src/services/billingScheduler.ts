import { prisma } from '../utils/database';
import { UserRole } from '../types/prisma';

// Fee rate: 3.99% = 399 basis points
const FEE_RATE_BPS = 399;
const FEE_RATE = 0.0399;

// Instance identifier for distributed locking
const INSTANCE_ID = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Acquire distributed lock for job execution
 * Returns true if lock acquired, false if already held
 */
export const acquireLock = async (jobName: string, ttlMs: number): Promise<boolean> => {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check if lock exists and is still valid
      const existingLock = await tx.jobLock.findUnique({
        where: { jobName }
      });

      if (!existingLock || existingLock.lockedUntil < now) {
        // Acquire or renew lock
        await tx.jobLock.upsert({
          where: { jobName },
          create: {
            jobName,
            lockedUntil,
            lockedBy: INSTANCE_ID
          },
          update: {
            lockedUntil,
            lockedBy: INSTANCE_ID
          }
        });
        return true;
      }

      return false;
    });

    if (result) {
      console.log(`[BillingScheduler] Acquired lock for job: ${jobName} (${INSTANCE_ID})`);
    } else {
      // Get lock info for logging
      const lockInfo = await prisma.jobLock.findUnique({
        where: { jobName }
      });
      console.log(`[BillingScheduler] Lock held for job: ${jobName} by ${lockInfo?.lockedBy}`);
    }

    return result;
  } catch (error) {
    console.error(`[BillingScheduler] Error acquiring lock for ${jobName}:`, error);
    return false;
  }
};

/**
 * Get billing period string in YYYY-MM format (Africa/Kampala timezone)
 * Uses same Kampala boundary logic as getPeriodDates() to ensure consistency
 */
export const getBillingPeriod = (date: Date = new Date()): string => {
  // Convert to Kampala timezone (UTC+3) using same offset logic as getPeriodDates
  const kampalaOffset = 3 * 60 * 60 * 1000; // UTC+3 in milliseconds
  const kampalaTime = new Date(date.getTime() + kampalaOffset);

  // Extract year and month from Kampala local time
  const year = kampalaTime.getUTCFullYear();
  const month = kampalaTime.getUTCMonth() + 1; // getUTCMonth() is 0-based

  return `${year}-${month.toString().padStart(2, '0')}`;
};

/**
 * Get period start and end dates for a billing period (Africa/Kampala timezone)
 */
export const getPeriodDates = (billingPeriod: string): { periodStart: Date; periodEnd: Date } => {
  const [year, month] = billingPeriod.split('-').map(Number);

  // Create dates in Kampala timezone (UTC+3) to ensure consistent month boundaries
  // Period is the full month in Kampala time
  const kampalaOffset = 3 * 60 * 60 * 1000; // UTC+3 in milliseconds

  // First day of month at 00:00:00 Kampala time
  const periodStartUTC = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const periodStart = new Date(periodStartUTC.getTime() - kampalaOffset);

  // Last day of month at 23:59:59.999 Kampala time
  const periodEndUTC = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const periodEnd = new Date(periodEndUTC.getTime() - kampalaOffset);

  return { periodStart, periodEnd };
};

/**
 * Generate missing monthly periods between last invoice and current date
 */
export const getMissingPeriods = (lastPeriod: string, currentPeriod: string): string[] => {
  const periods = [];
  let [year, month] = lastPeriod.split('-').map(Number);
  const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);

  while (year < currentYear || (year === currentYear && month < currentMonth)) {
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    periods.push(`${year}-${month.toString().padStart(2, '0')}`);
  }

  return periods;
};

/**
 * Get latest invoice period for a manager
 */
// Fixed: Return type changed from undefined to null to match TypeScript expectations
export const getLatestInvoicePeriod = async (managerId: string): Promise<string | null> => {
  const latestInvoice = await prisma.invoice.findFirst({
    where: { managerId },
    orderBy: { periodStart: 'desc' },
    select: { periodStart: true }
  });

  return latestInvoice && latestInvoice.periodStart ? getBillingPeriod(latestInvoice.periodStart) : null;
};

/**
 * Generate backfill invoices for all missing periods
 */
export const ensureBackfillInvoicesForAllManagers = async (now: Date = new Date()): Promise<{ invoicesCreatedCount: number }> => {
  console.log(`[BillingScheduler] Starting backfill invoice generation for ${now.toISOString()}...`);
  console.log(`[BillingScheduler] Current period: ${getBillingPeriod(now)}`);

  const currentPeriod = getBillingPeriod(now);
  let invoicesCreatedCount = 0;

  try {
    // Get all managers with occupied units
    console.log(`[BillingScheduler] Querying for occupied leases...`);
    const occupiedLeases = await prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } // Include leases starting today or in the past
      },
      include: {
        property: {
          include: {
            manager: true
          }
        }
      }
    });

    console.log(`[BillingScheduler] Found ${occupiedLeases.length} occupied leases total`);

    // Log each lease for debugging
    occupiedLeases.forEach((lease, index) => {
      console.log(`[BillingScheduler] Lease ${index + 1}: id=${lease.id}, tenantId=${lease.tenantId}, propertyId=${lease.propertyId}, startDate=${lease.startDate}, status=${lease.status}`);
      console.log(`[BillingScheduler]   Property: id=${lease.property.id}, managerId=${lease.property.managerId}`);
      console.log(`[BillingScheduler]   Manager: id=${lease.property.manager?.id}, role=${lease.property.manager?.role}`);
    });

    // Group by manager to avoid duplicates
    const managerIds = new Set(occupiedLeases.map(lease => lease.property.managerId).filter(Boolean));
    console.log(`[BillingScheduler] Found ${managerIds.size} unique managers with occupied units`);
    console.log(`[BillingScheduler] Found ${managerIds.size} managers with occupied units for backfill`);

    for (const managerId of Array.from(managerIds)) {
      console.log(`[BillingScheduler] Processing manager: ${managerId}`);

      // Get manager details to verify role
      const manager = await prisma.user.findFirst({
        where: { id: managerId as string },
        select: { role: true, createdAt: true }
      });

      console.log(`[BillingScheduler] Manager ${managerId}: role=${manager?.role}, createdAt=${manager?.createdAt}`);

      if (!manager || manager.role !== UserRole.MANAGER) {
        console.log(`[BillingScheduler] Manager ${managerId}: Skipping - not a manager`);
        continue;
      }

      // Find last invoice period for this manager
      const lastPeriod = await getLatestInvoicePeriod(managerId as string);

      // Determine missing periods - guaranteed string with nullish coalescing
      const startPeriod = lastPeriod ?? getBillingPeriod(manager.createdAt || new Date());
      console.log(`[BillingScheduler] Manager ${managerId}: lastPeriod=${lastPeriod}, startPeriod=${startPeriod}`);
      if (!startPeriod) {
        console.log(`[BillingScheduler] Manager ${managerId}: No valid start period found, skipping`);
        continue;
      }
      const missingPeriods = getMissingPeriods(startPeriod, currentPeriod);

      console.log(`[BillingScheduler] Manager ${managerId}: backfilling ${missingPeriods.length} periods from ${startPeriod} to ${currentPeriod}`);

      for (const period of missingPeriods) {
        const { periodStart, periodEnd } = getPeriodDates(period);

        // Check if invoice already exists for this period
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            managerId: managerId as string,
            periodStart: { gte: periodStart },
            periodEnd: { lte: periodEnd }
          }
        });

        if (existingInvoice) {
          console.log(`[BillingScheduler] Invoice already exists for manager ${managerId}, period ${period}`);
          continue;
        }

        // Get all occupied units for this manager ACTIVE at period start (Option A snapshot)
        const occupiedUnits = await prisma.lease.findMany({
          where: {
            status: 'ACTIVE',
            property: { managerId: managerId as string },
            startDate: { lte: periodStart },
            OR: [
              { endDate: null },
              { endDate: { gte: periodStart } }
            ]
          },
          include: {
            property: true,
            unit: true,
            tenantIdentity: true
          }
        });

        if (occupiedUnits.length === 0) {
          console.log(`[BillingScheduler] No occupied units for manager ${managerId}, period ${period}`);
          continue;
        }

        // Calculate subtotal
        const subtotalAmount = occupiedUnits.reduce((sum, lease) => sum + lease.rentAmount, 0);
        const feeAmount = Math.round(subtotalAmount * FEE_RATE);

        try {
          // Create invoice with DB uniqueness protection
          const invoice = await prisma.invoice.create({
            data: {
              managerId: managerId as string,
              periodStart,
              periodEnd,
              subtotalAmount,
              feeRateBps: FEE_RATE_BPS,
              feeAmount,
              status: 'DUE',
              dueDate: new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after period end
              lines: {
                create: occupiedUnits.map(lease => ({
                  propertyId: lease.propertyId,
                  unitId: lease.unitId,
                  rentAmount: lease.rentAmount,
                  tenantId: lease.tenantId,
                  leaseId: lease.id
                }))
              }
            }
          });

          console.log(`[BillingScheduler] Created backfill invoice ${invoice.id} for manager ${managerId}, period ${period}: ${invoice.feeAmount} UGX fee`);
          invoicesCreatedCount++;
        } catch (createError: any) {
          // Handle unique constraint violation gracefully
          if (createError.code === 'P2002' && createError.meta?.target?.includes('unique_manager_billing_period')) {
            console.log(`[BillingScheduler] Invoice already exists (race condition) for manager ${managerId}, period ${period}`);
            continue;
          }
          throw createError;
        }
      }
    }

    console.log(`[BillingScheduler] Backfill invoice generation complete. Created ${invoicesCreatedCount} invoices`);

  } catch (error) {
    console.error('[BillingScheduler] Error generating backfill invoices:', error);
    throw error;
  }

  return { invoicesCreatedCount };
};

/**
 * Generate monthly invoices for all managers with occupied units
 * Production-safe with DB uniqueness and proper billing periods
 */
export const ensureMonthlyInvoicesForAllManagers = async (now: Date = new Date()): Promise<{ invoicesCreatedCount: number }> => {
  console.log(`[BillingScheduler] Starting invoice generation for ${now.toISOString()}`);

  const currentPeriod = getBillingPeriod(now);
  const { periodStart, periodEnd } = getPeriodDates(currentPeriod);

  console.log(`[BillingScheduler] Billing period: ${currentPeriod} (${periodStart.toISOString()} to ${periodEnd.toISOString()})`);

  let invoicesCreatedCount = 0;

  try {
    // Get all managers with occupied units ACTIVE at period start (Option A snapshot)
    const occupiedLeases = await prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: periodStart },
        OR: [
          { endDate: null },
          { endDate: { gte: periodStart } }
        ]
      },
      include: {
        property: {
          include: {
            manager: true
          }
        }
      }
    });

    // Group by manager to avoid duplicates
    const managerIds = new Set(occupiedLeases.map(lease => lease.property.managerId).filter(Boolean));
    console.log(`[BillingScheduler] Found ${managerIds.size} managers with occupied units`);

    for (const managerId of Array.from(managerIds)) {
      // Get manager details to verify role
      const manager = await prisma.user.findFirst({
        where: { id: managerId as string },
        select: { role: true }
      });

      if (!manager || manager.role !== UserRole.MANAGER) {
        continue;
      }

      // Check if invoice already exists for this period (DB uniqueness handles this)
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          managerId: managerId as string,
          periodStart: { gte: periodStart },
          periodEnd: { lte: periodEnd }
        }
      });

      if (existingInvoice) {
        console.log(`[BillingScheduler] Invoice already exists for manager ${managerId}, period ${currentPeriod}`);
        continue;
      }

      // Get all occupied units for this manager ACTIVE at period start (Option A snapshot)
      const occupiedUnits = await prisma.lease.findMany({
        where: {
          status: 'ACTIVE',
          property: { managerId: managerId as string },
          startDate: { lte: periodStart },
          OR: [
            { endDate: null },
            { endDate: { gte: periodStart } }
          ]
        },
        include: {
          property: true,
          unit: true,
          tenantIdentity: true
        }
      });

      if (occupiedUnits.length === 0) {
        console.log(`[BillingScheduler] No occupied units for manager ${managerId}, period ${currentPeriod}`);
        continue;
      }

      // Calculate subtotal
      const subtotalAmount = occupiedUnits.reduce((sum, lease) => sum + lease.rentAmount, 0);
      const feeAmount = Math.round(subtotalAmount * FEE_RATE);

      try {
        // Create invoice for this manager (Option A: immutable snapshot at period start)
        // Only leases ACTIVE at periodStart are included - no mid-period changes affect invoice
        const invoice = await prisma.invoice.create({
          data: {
            managerId: managerId as string,
            periodStart,
            periodEnd,
            subtotalAmount,
            feeRateBps: FEE_RATE_BPS,
            feeAmount,
            status: 'DUE',
            dueDate: new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after period end
            lines: {
              create: occupiedUnits.map(lease => ({
                propertyId: lease.propertyId,
                unitId: lease.unitId,
                rentAmount: lease.rentAmount,
                tenantId: lease.tenantId,
                leaseId: lease.id
              }))
            }
          }
        });

        console.log(`[BillingScheduler] Created invoice ${invoice.id} for manager ${managerId}, period ${currentPeriod}: ${invoice.feeAmount} UGX fee`);
        invoicesCreatedCount++;
      } catch (createError: any) {
        // Handle unique constraint violation gracefully
        if (createError.code === 'P2002' && createError.meta?.target?.includes('unique_manager_billing_period')) {
          console.log(`[BillingScheduler] Invoice already exists (race condition) for manager ${managerId}, period ${currentPeriod}`);
          continue;
        }
        throw createError;
      }
    }

    console.log(`[BillingScheduler] Invoice generation complete. Created ${invoicesCreatedCount} invoices for period ${currentPeriod}`);

  } catch (error) {
    console.error('[BillingScheduler] Error generating monthly invoices:', error);
    throw error;
  }

  return { invoicesCreatedCount };
};

/**
 * Mark overdue invoices (unpaid and past due date)
 */
export const markOverdueInvoices = async (now: Date = new Date()): Promise<{ invoicesMarkedOverdueCount: number }> => {
  console.log(`[BillingScheduler] Starting overdue invoice marking for ${now.toISOString()}`);

  let invoicesMarkedOverdueCount = 0;

  try {
    // Find all DUE invoices past their due date
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: 'DUE',
        dueDate: { lt: now }
      },
      include: {
        manager: {
          select: { id: true, billingStatus: true }
        }
      }
    });

    console.log(`[BillingScheduler] Found ${overdueInvoices.length} overdue invoices`);

    for (const invoice of overdueInvoices) {
      // Update invoice status
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' }
      });

      // Update manager billing status if not already overdue
      if (invoice.manager.billingStatus !== 'OVERDUE') {
        await prisma.user.update({
          where: { id: invoice.managerId },
          data: {
            billingStatus: 'OVERDUE',
            billingGraceUntil: null
          }
        });
      }

      console.log(`[BillingScheduler] Marked invoice ${invoice.id} as OVERDUE, manager ${invoice.managerId} billing set to OVERDUE`);
      invoicesMarkedOverdueCount++;
    }

    console.log(`[BillingScheduler] Overdue invoice marking complete. Marked ${invoicesMarkedOverdueCount} invoices as overdue`);

  } catch (error) {
    console.error('[BillingScheduler] Error marking overdue invoices:', error);
    throw error;
  }

  return { invoicesMarkedOverdueCount };
};

/**
 * Sync manager billing status based on actual invoice states (DB-grounded enforcement)
 */
export const syncManagerBillingStatus = async (now: Date = new Date()): Promise<{ managersUpdatedCount: number }> => {
  console.log(`[BillingScheduler] Starting manager billing status sync for ${now.toISOString()}`);

  let managersUpdatedCount = 0;

  try {
    // Get all managers
    const managers = await prisma.user.findMany({
      where: { role: UserRole.MANAGER },
      select: { id: true, billingStatus: true }
    });

    for (const manager of managers) {
      // Check for any overdue invoices (DB truth)
      const hasOverdueInvoice = await prisma.invoice.findFirst({
        where: {
          managerId: manager.id,
          status: 'OVERDUE'
        }
      });

      // Check for any due invoices (not overdue yet)
      const hasDueInvoice = await prisma.invoice.findFirst({
        where: {
          managerId: manager.id,
          status: 'DUE'
        }
      });

      let newBillingStatus: string;

      if (hasOverdueInvoice) {
        newBillingStatus = 'OVERDUE';
      } else if (hasDueInvoice) {
        newBillingStatus = 'CURRENT'; // Has due invoice but not overdue
      } else {
        newBillingStatus = 'CURRENT'; // No outstanding invoices
      }

      // Update if status changed
      if (manager.billingStatus !== newBillingStatus) {
        await prisma.user.update({
          where: { id: manager.id },
          data: {
            billingStatus: newBillingStatus,
            ...(newBillingStatus === 'CURRENT' ? { billingGraceUntil: null } : {})
          }
        });

        console.log(`[BillingScheduler] Updated manager ${manager.id} billing status: ${manager.billingStatus} → ${newBillingStatus}`);
        managersUpdatedCount++;
      }
    }

    console.log(`[BillingScheduler] Manager billing status sync complete. Updated ${managersUpdatedCount} managers`);

  } catch (error) {
    console.error('[BillingScheduler] Error syncing manager billing status:', error);
    throw error;
  }

  return { managersUpdatedCount };
};

/**
 * Main scheduler function - runs all billing tasks with distributed locking
 */
export const runDailyBillingTasks = async (now: Date = new Date()): Promise<{
  invoicesCreatedCount: number;
  invoicesMarkedOverdueCount: number;
  managersUpdatedCount: number;
}> => {
  console.log(`[BillingScheduler] Starting daily billing tasks for ${now.toISOString()} (${INSTANCE_ID})`);

  const results = {
    invoicesCreatedCount: 0,
    invoicesMarkedOverdueCount: 0,
    managersUpdatedCount: 0
  };

  // Acquire distributed lock (5 minute TTL)
  const lockAcquired = await acquireLock('daily-billing-tasks', 5 * 60 * 1000);

  if (!lockAcquired) {
    console.log(`[BillingScheduler] Daily tasks skipped - lock held by another instance`);
    return results;
  }

  try {
    // Task 1: Generate backfill invoices for all missing periods
    const backfillResults = await ensureBackfillInvoicesForAllManagers(now);
    results.invoicesCreatedCount += backfillResults.invoicesCreatedCount;

    // Task 2: Generate monthly invoices for current period
    const invoiceResults = await ensureMonthlyInvoicesForAllManagers(now);
    results.invoicesCreatedCount += invoiceResults.invoicesCreatedCount;

    // Task 3: Mark overdue invoices
    const overdueResults = await markOverdueInvoices(now);
    results.invoicesMarkedOverdueCount = overdueResults.invoicesMarkedOverdueCount;

    // Task 4: Sync manager billing status (DB-grounded enforcement)
    const syncResults = await syncManagerBillingStatus(now);
    results.managersUpdatedCount = syncResults.managersUpdatedCount;

    console.log(`[BillingScheduler] Daily billing tasks completed:`, results);

  } catch (error) {
    console.error('[BillingScheduler] Error in daily billing tasks:', error);
    throw error;
  }

  return results;
};
