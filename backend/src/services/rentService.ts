import { prisma } from '../utils/database';

// Simple type aliases for Prisma models used in this service
// We rely on the existing schema for the actual shape.
type Lease = any;
type Payment = any;

/**
 * Rent status enumeration for tenant billing periods.
 * 
 * - PAID: Tenant has paid the full rent amount for the current billing period
 * - PARTIAL: Tenant has made a partial payment but still owes money for the current period
 * - OVERDUE: Payment due date has passed and tenant has unpaid balance
 * - NOT_DUE: Payment is not yet due (before due date) or tenant has no outstanding balance
 * - NO_LEASE: Tenant has no active lease
 */
export type RentStatusValue = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'NOT_DUE' | 'NO_LEASE';

/**
 * Complete rent status information for a tenant's current billing period.
 * 
 * This interface provides all fields needed by the mobile UI to display:
 * - Lease and property identification
 * - Current billing period amounts and status
 * - Historical arrears
 * - Time-based payment urgency indicators
 */
export interface TenantRentStatus {
  /** Lease ID if tenant has an active lease, null otherwise */
  leaseId: string | null;
  /** Property ID if tenant has an active lease, null otherwise */
  propertyId: string | null;
  /** Unit ID if tenant has an active lease, null otherwise */
  unitId: string | null;
  /** Monthly rent amount from lease, null if no active lease */
  rentAmount: number | null;
  /** Current billing period in YYYY-MM format */
  billingPeriod: string;
  /** Due date for current period (ISO string), calculated from lease start date day-of-month */
  dueDate: string | null;
  /** Total amount paid for current billing period (sum of PAID payments) */
  totalPaidForPeriod: number;
  /** Expected rent amount for current period (equals rentAmount) */
  amountDueForPeriod: number;
  /** Total unpaid rent from prior billing periods (assumes constant rent amount) */
  arrearsTotal: number;
  /** Current payment status */
  status: RentStatusValue;
  /** Days until payment is due (null if no due date or already overdue) */
  daysUntilDue: number | null;
  /** Days payment is overdue (null if not overdue or no due date) */
  daysOverdue: number | null;
}

/**
 * Parse a billing period string (YYYY-MM) into year and month components.
 * @param period - Billing period in YYYY-MM format
 * @returns Parsed year and month (0-based)
 */
const parseBillingPeriod = (period: string): { year: number; month: number } => {
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // Convert to 0-based
  return { year, month };
};

/**
 * Get billing period details for a given reference date or period string.
 * @param referenceDate - Date to derive period from (if period not provided)
 * @param period - Optional explicit period in YYYY-MM format
 * @returns Period details including start/end dates
 */
const getBillingPeriodDetails = (referenceDate: Date, period?: string) => {
  let year: number;
  let month: number;
  let billingPeriod: string;

  if (period && /^\d{4}-\d{2}$/.test(period)) {
    // Use provided period
    ({ year, month } = parseBillingPeriod(period));
    billingPeriod = period;
  } else {
    // Default to current period
    year = referenceDate.getUTCFullYear();
    month = referenceDate.getUTCMonth(); // 0-based
    billingPeriod = `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  const periodStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const nextMonthStart = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

  return { year, month, billingPeriod, periodStart, nextMonthStart };
};

const getDueDateForPeriod = (leaseStartDate: Date, year: number, month: number): Date => {
  const dueDay = leaseStartDate.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0, 0)).getUTCDate();
  const clampedDay = Math.min(dueDay, daysInMonth);
  return new Date(Date.UTC(year, month, clampedDay, 0, 0, 0, 0));
};

const diffInDays = (later: Date, earlier: Date): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = Date.UTC(earlier.getUTCFullYear(), earlier.getUTCMonth(), earlier.getUTCDate());
  const end = Date.UTC(later.getUTCFullYear(), later.getUTCMonth(), later.getUTCDate());
  return Math.floor((end - start) / msPerDay);
};

export class RentService {
  /**
   * Get comprehensive rent status for a tenant's billing period.
   * 
   * **Computation Rules:**
   * 
   * 1. **Billing Period**: Uses provided period or defaults to current month (YYYY-MM format)
   * 
   * 2. **Due Date**: Calculated from lease start date's day-of-month
   *    - Example: Lease starts Jan 15 → rent due on 15th of each month
   *    - Handles month-end edge cases (e.g., Jan 31 → Feb 28/29)
   * 
   * 3. **Payments**: Queries PAID payments for the billing period
   *    - Uses Payment.billingPeriod field (required field, indexed)
   *    - Only counts status='PAID' payments
   * 
   * 4. **Arrears**: Calculates unpaid rent from prior months (before target period)
   *    - **Assumption**: Rent amount has been constant since lease start
   *    - Formula: (priorMonthsCount * rentAmount) - totalPaidBeforeTargetPeriod
   *    - Uses billingPeriod for accurate period attribution
   *    - Does NOT account for mid-lease rent changes
   * 
   * 5. **Status Logic**:
   *    - NO_LEASE: No active lease found
   *    - PAID: totalPaidForPeriod >= amountDueForPeriod
   *    - PARTIAL: Some payment made but not full amount
   *    - OVERDUE: Past due date with unpaid balance (current period) OR unpaid historical period
   *    - NOT_DUE: Before due date with unpaid balance (current period only)
   *    
   *    **Historical Period Policy:** Historical queries (period ≠ current) never return NOT_DUE.
   *    Unpaid historical periods always return OVERDUE since they are in the past.
   * 
   * 6. **Days Calculation**: Based on UTC date comparison (ignores time-of-day)
   * 
   * @param tenantId - Tenant identity ID (not user ID)
   * @param period - Optional billing period in YYYY-MM format (defaults to current month)
   * @returns Complete rent status with all 12 fields
   */
  async getTenantRentStatus(tenantId: string, period?: string): Promise<TenantRentStatus> {
    const now = new Date();
    const { year, month, billingPeriod, periodStart, nextMonthStart } = getBillingPeriodDetails(now, period);

    // Determine if this is a historical period query
    const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const isHistoricalQuery = billingPeriod !== currentPeriod;

    // Find active lease for this tenant
    const lease: Lease | null = await (prisma as any).lease.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });

    if (!lease) {
      return {
        leaseId: null,
        propertyId: null,
        unitId: null,
        rentAmount: null,
        billingPeriod,
        dueDate: null,
        totalPaidForPeriod: 0,
        amountDueForPeriod: 0,
        arrearsTotal: 0,
        status: 'NO_LEASE',
        daysUntilDue: null,
        daysOverdue: null,
      };
    }

    const rentAmount: number = lease.rentAmount;
    const dueDate = getDueDateForPeriod(lease.startDate, year, month);
    const amountDueForPeriod = rentAmount;

    // Payments for target billing period
    // Use billingPeriod field (required field, always populated)
    const paymentsThisPeriod: Payment[] = await (prisma as any).payment.findMany({
      where: {
        tenantId,
        status: 'PAID',
        billingPeriod,
      },
    });

    const totalPaidForPeriod = paymentsThisPeriod.reduce((sum: number, p: any) => sum + p.amount, 0);

    // Arrears over past months (before target billing period)
    const leaseStartDate: Date = lease.startDate;
    const startYear = leaseStartDate.getUTCFullYear();
    const startMonth = leaseStartDate.getUTCMonth();

    // Calculate months from lease start to month BEFORE target period
    let priorMonthsCount = year * 12 + month - (startYear * 12 + startMonth);
    if (priorMonthsCount < 0) {
      priorMonthsCount = 0;
    }

    let arrearsTotal = 0;

    if (priorMonthsCount > 0) {
      // Build list of prior billing periods
      const priorPeriods: string[] = [];
      for (let i = 0; i < priorMonthsCount; i++) {
        const priorYear = startYear + Math.floor((startMonth + i) / 12);
        const priorMonth = (startMonth + i) % 12;
        priorPeriods.push(`${priorYear}-${String(priorMonth + 1).padStart(2, '0')}`);
      }

      // Get payments for prior periods
      // Match by billingPeriod in prior periods list (required field, always populated)
      const paymentsBeforePeriod: Payment[] = await (prisma as any).payment.findMany({
        where: {
          tenantId,
          status: 'PAID',
          billingPeriod: { in: priorPeriods },
        },
      });

      const totalPaidBefore = paymentsBeforePeriod.reduce((sum: number, p: any) => sum + p.amount, 0);
      const expectedBefore = rentAmount * priorMonthsCount;
      arrearsTotal = Math.max(0, expectedBefore - totalPaidBefore);
    }

    // Status and day deltas
    let status: RentStatusValue = 'NOT_DUE';
    let daysUntilDue: number | null = null;
    let daysOverdue: number | null = null;

    const remainingForPeriod = Math.max(0, amountDueForPeriod - totalPaidForPeriod);

    // For historical queries, do not calculate days (misleading)
    if (isHistoricalQuery) {
      // Status determination for historical periods (Policy A)
      // Historical periods are in the past, so unpaid = OVERDUE (not NOT_DUE)
      if (remainingForPeriod <= 0) {
        status = 'PAID';
      } else if (totalPaidForPeriod > 0) {
        status = 'PARTIAL';
      } else {
        // Unpaid historical period is always OVERDUE
        status = 'OVERDUE';
      }
      // Days remain null for historical queries
      daysUntilDue = null;
      daysOverdue = null;
    } else {
      // Current period - calculate days normally
      if (now < dueDate) {
        daysUntilDue = diffInDays(dueDate, now);
        daysOverdue = 0;
        if (remainingForPeriod <= 0) {
          status = 'PAID';
        } else {
          status = 'NOT_DUE';
        }
      } else if (diffInDays(now, dueDate) === 0) {
        // Due today
        daysUntilDue = 0;
        daysOverdue = 0;
        if (remainingForPeriod <= 0) {
          status = 'PAID';
        } else {
          status = 'NOT_DUE';
        }
      } else {
        // Now is after due date
        daysUntilDue = 0;
        daysOverdue = diffInDays(now, dueDate);

        if (remainingForPeriod <= 0) {
          status = 'PAID';
          daysOverdue = 0;
        } else if (totalPaidForPeriod > 0) {
          status = 'PARTIAL';
        } else {
          status = 'OVERDUE';
        }
      }
    }

    return {
      leaseId: lease.id,
      propertyId: lease.propertyId,
      unitId: lease.unitId,
      rentAmount,
      billingPeriod,
      dueDate: dueDate.toISOString(),
      totalPaidForPeriod,
      amountDueForPeriod,
      arrearsTotal,
      status,
      daysUntilDue,
      daysOverdue,
    };
  }
}
