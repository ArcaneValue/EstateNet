import { prisma } from '../utils/database';

// Simple type aliases for Prisma models used in this service
// We rely on the existing schema for the actual shape.
type Lease = any;
type Payment = any;

export type RentStatusValue = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'NOT_DUE' | 'NO_LEASE';

export interface TenantRentStatus {
  leaseId: string | null;
  propertyId: string | null;
  unitId: string | null;
  rentAmount: number | null;
  billingPeriod: string;
  dueDate: string | null;
  totalPaidForPeriod: number;
  amountDueForPeriod: number;
  arrearsTotal: number;
  status: RentStatusValue;
  daysUntilDue: number | null;
  daysOverdue: number | null;
}

const getCurrentBillingPeriod = (referenceDate: Date) => {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth(); // 0-based
  const billingPeriod = `${year}-${String(month + 1).padStart(2, '0')}`;
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
  async getTenantRentStatus(tenantId: string): Promise<TenantRentStatus> {
    const now = new Date();
    const { year, month, billingPeriod, periodStart, nextMonthStart } = getCurrentBillingPeriod(now);

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

    // Payments for current billing period
    const paymentsThisPeriod: Payment[] = await (prisma as any).payment.findMany({
      where: {
        tenantId,
        dueDate: {
          gte: periodStart,
          lt: nextMonthStart,
        },
        status: 'PAID',
      },
    });

    const totalPaidForPeriod = paymentsThisPeriod.reduce((sum: number, p: any) => sum + p.amount, 0);

    // Arrears over past months (before current billing period)
    const leaseStartDate: Date = lease.startDate;
    const startYear = leaseStartDate.getUTCFullYear();
    const startMonth = leaseStartDate.getUTCMonth();

    let monthsSinceStart = year * 12 + month - (startYear * 12 + startMonth);
    if (monthsSinceStart < 0) {
      monthsSinceStart = 0;
    }

    let arrearsTotal = 0;

    if (monthsSinceStart > 0) {
      const paymentsBeforePeriod: Payment[] = await (prisma as any).payment.findMany({
        where: {
          tenantId,
          dueDate: {
            lt: periodStart,
          },
          status: 'PAID',
        },
      });

      const totalPaidBefore = paymentsBeforePeriod.reduce((sum: number, p: any) => sum + p.amount, 0);
      const expectedBefore = rentAmount * monthsSinceStart;
      arrearsTotal = Math.max(0, expectedBefore - totalPaidBefore);
    }

    // Status and day deltas
    let status: RentStatusValue = 'NOT_DUE';
    let daysUntilDue: number | null = null;
    let daysOverdue: number | null = null;

    const remainingForPeriod = Math.max(0, amountDueForPeriod - totalPaidForPeriod);

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
