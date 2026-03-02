import { prisma } from '../utils/database';

type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Service for allocating verified payment claims to rent periods
 */
export class PaymentAllocationService {
  /**
   * Allocates a verified payment claim to the earliest unpaid rent periods
   */
  async allocatePaymentToRent(
    tx: PrismaTransactionClient,
    leaseId: string,
    tenantId: string,
    amount: number,
    monthlyRent: number,
    claimedPaidAt: Date
  ): Promise<void> {
    const monthsPaid = amount / monthlyRent;

    if (monthsPaid !== Math.floor(monthsPaid)) {
      throw new Error('Payment amount must be exact multiple of monthly rent');
    }

    // Get lease details for property and unit info
    const lease = await tx.lease.findUnique({
      where: { id: leaseId },
      select: {
        propertyId: true,
        unitId: true,
        startDate: true
      }
    });

    if (!lease) {
      throw new Error('Lease not found');
    }

    // Get existing paid payments to determine billing periods covered
    const existingPayments = await tx.payment.findMany({
      where: {
        tenantId,
        status: 'PAID'
      },
      select: {
        billingPeriod: true
      },
      orderBy: {
        billingPeriod: 'asc'
      }
    });

    const paidPeriods = new Set(existingPayments.map(p => p.billingPeriod));

    // Generate billing periods starting from lease start date
    const leaseStartDate = lease.startDate;
    const currentDate = new Date();

    // Find the earliest unpaid months
    const periodsToCreate = [];
    let periodDate = new Date(leaseStartDate);
    let allocatedMonths = 0;

    while (allocatedMonths < monthsPaid) {
      const billingPeriod = this.formatBillingPeriod(periodDate);

      // Only allocate to periods that haven't been paid
      if (!paidPeriods.has(billingPeriod)) {
        const dueDate = this.calculateDueDate(periodDate);

        periodsToCreate.push({
          tenantId,
          propertyId: lease.propertyId,
          unitId: lease.unitId,
          amount: monthlyRent,
          status: 'PAID' as const,
          paymentMethod: 'CLAIM_VERIFICATION',
          paymentDate: claimedPaidAt,
          dueDate,
          billingPeriod
        });

        allocatedMonths++;
      }

      // Move to next month
      periodDate.setMonth(periodDate.getMonth() + 1);

      // Safety check to prevent infinite loop
      if (periodDate > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) {
        throw new Error('Unable to allocate all payment months within reasonable timeframe');
      }
    }

    // Batch create all payment records
    if (periodsToCreate.length > 0) {
      await tx.payment.createMany({
        data: periodsToCreate
      });
    }

    console.log(`[PaymentAllocation] Allocated ${monthsPaid} months of payments for tenant ${tenantId}`);
  }

  /**
   * Format date as billing period string (YYYY-MM)
   */
  private formatBillingPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Calculate due date for a billing period (typically end of month)
   */
  private calculateDueDate(periodStart: Date): Date {
    const dueDate = new Date(periodStart);
    // Set to last day of the month
    dueDate.setMonth(dueDate.getMonth() + 1, 0);
    return dueDate;
  }

  /**
   * Get current billing period for reference
   */
  getCurrentBillingPeriod(): string {
    return this.formatBillingPeriod(new Date());
  }

  /**
   * Calculate how many months are unpaid for a tenant
   */
  async getUnpaidMonthsCount(tenantId: string): Promise<number> {
    const lease = await prisma.lease.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE'
      },
      select: {
        startDate: true
      }
    });

    if (!lease) {
      return 0;
    }

    const paidPayments = await prisma.payment.findMany({
      where: {
        tenantId,
        status: 'PAID'
      },
      select: {
        billingPeriod: true
      }
    });

    const paidPeriods = new Set(paidPayments.map((p: any) => p.billingPeriod));

    // Count months from lease start to current month
    const startDate = new Date(lease.startDate);
    const currentDate = new Date();
    let totalMonths = 0;
    let unpaidMonths = 0;

    const periodDate = new Date(startDate);
    while (periodDate <= currentDate) {
      const billingPeriod = this.formatBillingPeriod(periodDate);
      totalMonths++;

      if (!paidPeriods.has(billingPeriod)) {
        unpaidMonths++;
      }

      periodDate.setMonth(periodDate.getMonth() + 1);
    }

    return unpaidMonths;
  }
}

// Export singleton instance
export const paymentAllocationService = new PaymentAllocationService();
