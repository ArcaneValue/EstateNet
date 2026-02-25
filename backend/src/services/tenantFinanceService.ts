import { prisma } from '../utils/database';
import { getCurrentBillingPeriod, validateBillingPeriod, getPeriodDates } from '../utils/billingPeriodHelpers';

export interface TenantRentStatus {
    period: string;
    hasActiveLeaseAtPeriodStart: boolean;
    expectedRent: number;
    paidForPeriod: number;
    outstandingForPeriod: number;
    status: 'PAID' | 'PARTIAL' | 'DUE' | 'NO_LEASE';
}

export const getTenantRentStatus = async (
    tenantId: string,
    period?: string
): Promise<TenantRentStatus> => {
    try {
        const targetPeriod = period || getCurrentBillingPeriod();

        if (!validateBillingPeriod(targetPeriod)) {
            throw new Error('Invalid period format. Expected YYYY-MM');
        }

        const { periodStart } = getPeriodDates(targetPeriod);

        // Find active lease at period start (Option A snapshot semantics)
        const activeLease = await prisma.lease.findFirst({
            where: {
                tenantId,
                status: 'ACTIVE',
                startDate: { lte: periodStart },
                OR: [
                    { endDate: null },
                    { endDate: { gte: periodStart } }
                ]
            }
        });

        if (!activeLease) {
            return {
                period: targetPeriod,
                hasActiveLeaseAtPeriodStart: false,
                expectedRent: 0,
                paidForPeriod: 0,
                outstandingForPeriod: 0,
                status: 'NO_LEASE'
            };
        }

        // Get PAID payments for this billing period
        const paidPayments = await (prisma as any).payment.findMany({
            where: {
                tenantId,
                billingPeriod: targetPeriod,
                status: 'PAID'
            }
        });

        const expectedRent = activeLease.rentAmount;
        const paidForPeriod = paidPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
        const outstandingForPeriod = Math.max(0, expectedRent - paidForPeriod);

        let status: 'PAID' | 'PARTIAL' | 'DUE';
        if (paidForPeriod >= expectedRent) {
            status = 'PAID';
        } else if (paidForPeriod > 0) {
            status = 'PARTIAL';
        } else {
            status = 'DUE';
        }

        return {
            period: targetPeriod,
            hasActiveLeaseAtPeriodStart: true,
            expectedRent,
            paidForPeriod,
            outstandingForPeriod,
            status
        };

    } catch (error) {
        console.error('Error getting tenant rent status:', error);
        throw error;
    }
};
