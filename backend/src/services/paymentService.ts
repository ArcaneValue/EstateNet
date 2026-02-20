import { prisma } from '../utils/database';

// Type assertions for the new models
type Payment = any;
type PaymentStatus = any;

// Helpers for billing periods and due dates
const getBillingPeriodForDate = (referenceDate: Date) => {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth(); // 0-based
  return { year, month };
};

const getDueDateForPeriod = (leaseStartDate: Date, year: number, month: number): Date => {
  const dueDay = leaseStartDate.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0, 0)).getUTCDate();
  const clampedDay = Math.min(dueDay, daysInMonth);
  return new Date(Date.UTC(year, month, clampedDay, 0, 0, 0, 0));
};

export interface CreatePaymentData {
  tenantId: string;
  propertyId: string;
  unitId: string;
  amount: number;
  paymentDate: string;
  dueDate: string;
  status?: PaymentStatus;
  paymentMethod?: string;
  transactionId?: string;
}

export interface PaymentSummary {
  totalRent: number;
  totalPaid: number;
  totalOutstanding: number;
  occupancyRate: number;
  netIncome: number;
}

export class PaymentService {
  async recordPayment(data: CreatePaymentData): Promise<Payment> {
    // Get tenant's active lease to validate and derive property/unit info
    const activeLease = await (prisma as any).lease.findFirst({
      where: {
        tenantId: data.tenantId,
        status: 'ACTIVE'
      },
      include: {
        property: true,
        unit: true
      }
    });

    if (!activeLease) {
      throw new Error('Tenant does not have an active lease');
    }

    // Compute billing-period due date based on lease start date and payment date
    const paymentDate = new Date(data.paymentDate);
    const { year, month } = getBillingPeriodForDate(paymentDate);
    const computedDueDate = getDueDateForPeriod(activeLease.startDate, year, month);

    // Override propertyId, unitId and dueDate from derived data
    const paymentData = {
      ...data,
      propertyId: activeLease.propertyId,
      unitId: activeLease.unitId,
      status: data.status || 'PAID',
      paymentDate: new Date(data.paymentDate).toISOString(), // Convert to full ISO DateTime
      dueDate: computedDueDate.toISOString(),
    };

    return await (prisma as any).payment.create({
      data: paymentData,
      include: {
        tenantIdentity: {
          select: {
            name: true,
            email: true
          }
        },
        property: {
          select: {
            name: true,
            location: true
          }
        },
        unit: {
          select: {
            unitNumber: true
          }
        }
      }
    });
  }

  async getPayments(tenantId?: string, propertyId?: string, allowedPropertyIds?: string[]): Promise<Payment[]> {
    const whereClause: any = {};

    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    if (propertyId) {
      whereClause.propertyId = propertyId;
    } else if (allowedPropertyIds && allowedPropertyIds.length > 0) {
      // When called for a manager without an explicit property filter, scope to allowed properties only
      whereClause.propertyId = {
        in: allowedPropertyIds
      };
    }

    return await (prisma as any).payment.findMany({
      where: whereClause,
      include: {
        tenantIdentity: {
          select: {
            name: true,
            email: true
          }
        },
        property: {
          select: {
            name: true,
            location: true
          }
        },
        unit: {
          select: {
            unitNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getPaymentSummary(propertyId?: string): Promise<PaymentSummary> {
    const whereClause = propertyId ? { propertyId } : {};

    // Get all payments
    const payments = await (prisma as any).payment.findMany({
      where: whereClause
    });

    // Get all units for occupancy calculation
    const units = await (prisma as any).unit.findMany({
      where: propertyId ? { propertyId } : {}
    });

    // Get all active leases for rent calculation
    const activeLeases = await (prisma as any).lease.findMany({
      where: {
        status: 'ACTIVE',
        ...(propertyId && { propertyId })
      }
    });

    const totalRent = activeLeases.reduce((sum: number, lease: any) => sum + lease.rentAmount, 0);
    const totalPaid = payments
      .filter((p: any) => p.status === 'PAID')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalOutstanding = totalRent - totalPaid;
    const occupiedUnits = units.filter((u: any) => u.isOccupied).length;
    const occupancyRate = units.length > 0 ? (occupiedUnits / units.length) * 100 : 0;

    return {
      totalRent,
      totalPaid,
      totalOutstanding,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      netIncome: totalPaid // Simplified for now
    };
  }
}
