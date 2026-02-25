import { prisma } from '../utils/database';
import { getPeriodDates, getCurrentBillingPeriod } from '../utils/billingPeriodHelpers';

export interface RentCollectionData {
    totalCollected: number;
    period: string;
    byProperty: Array<{
        propertyId: string;
        propertyName: string;
        expectedRent: number;
        collectedRent: number;
        collectionRate: number;
    }>;
    recentPayments: Array<{
        id: string;
        amount: number;
        paymentDate: string;
        tenantName: string;
        propertyName: string;
        unitNumber: string;
        status: string;
    }>;
}

export interface OutstandingRentData {
    totalOutstanding: number;
    overdueTenantsCount: number;
    period: string;
    items: Array<{
        tenantId: string;
        tenantName: string;
        tenantPhone: string | null;
        propertyId: string;
        propertyName: string;
        unitId: string;
        unitNumber: string;
        leaseId: string;
        expectedRent: number;
        collectedRent: number;
        amountOutstanding: number;
        lastPaymentAt: string | null;
    }>;
}

export interface CashflowStatementData {
    period: string;
    operatingActivities: {
        inflows: {
            rentCollected: number;
            description: string;
        };
        outflows: {
            expenses: number;
            description: string;
        };
        netOperatingCashflow: number;
    };
    investingActivities: {
        inflows: number;
        outflows: number;
        netInvestingCashflow: number;
        description: string;
    };
    financingActivities: {
        inflows: number;
        outflows: number;
        netFinancingCashflow: number;
        description: string;
    };
    netCashflow: number;
    disclaimer: string;
}

export interface IncomeStatementData {
    period: string;
    revenue: {
        rentIncome: number;
        otherIncome: number;
        totalRevenue: number;
    };
    expenses: {
        operatingExpenses: number;
        maintenanceExpenses: number;
        administrativeExpenses: number;
        totalExpenses: number;
        description: string;
    };
    netIncome: number;
    disclaimer: string;
}

export interface FinancialPositionData {
    period: string;
    assets: {
        current: {
            cashReceivedInPeriod: number;
            rentReceivableForPeriod: number;
            totalCurrentAssets: number;
        };
        nonCurrent: {
            propertyPlantEquipment: number;
            totalNonCurrentAssets: number;
            description: string;
        };
        totalAssets: number;
    };
    liabilities: {
        current: {
            accountsPayable: number;
            totalCurrentLiabilities: number;
        };
        nonCurrent: {
            longTermDebt: number;
            totalNonCurrentLiabilities: number;
        };
        totalLiabilities: number;
        description: string;
    };
    equity: {
        retainedEarnings: number;
        totalEquity: number;
    };
    disclaimer: string;
}

// Use centralized billing period helpers

export const getRentCollectionData = async (
    managerId: string,
    period?: string,
    propertyId?: string
): Promise<RentCollectionData> => {
    try {
        const targetPeriod = period || getCurrentBillingPeriod();
        const { periodStart, periodEnd } = getPeriodDates(targetPeriod);

        // Get properties owned by this manager
        const ownedProperties = await prisma.property.findMany({
            where: {
                managerId,
                ...(propertyId && { id: propertyId })
            },
            select: { id: true, name: true }
        });

        const propertyIds = ownedProperties.map(p => p.id);

        if (propertyIds.length === 0) {
            return {
                totalCollected: 0,
                period: targetPeriod,
                byProperty: [],
                recentPayments: []
            };
        }

        // Get active leases at period start (Option A snapshot semantics)
        const activeLeases = await prisma.lease.findMany({
            where: {
                propertyId: { in: propertyIds },
                status: 'ACTIVE',
                startDate: { lte: periodStart },
                OR: [
                    { endDate: null },
                    { endDate: { gte: periodStart } }
                ]
            },
            include: {
                property: { select: { id: true, name: true } },
                unit: { select: { id: true, unitNumber: true } },
                tenantIdentity: { select: { name: true, tenantId: true } }
            }
        });

        // Get PAID payments for the billing period
        const paidPayments = await (prisma as any).payment.findMany({
            where: {
                propertyId: { in: propertyIds },
                status: 'PAID',
                billingPeriod: targetPeriod
            },
            include: {
                property: { select: { name: true } },
                unit: { select: { unitNumber: true } },
                tenantIdentity: { select: { name: true } }
            },
            orderBy: { paymentDate: 'desc' },
            take: 20
        });

        // Calculate totals
        const totalExpectedRent = activeLeases.reduce((sum, lease) => sum + lease.rentAmount, 0);
        const totalCollected = paidPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);

        // Group by property
        const byProperty = ownedProperties.map(property => {
            const propertyLeases = activeLeases.filter(lease => lease.propertyId === property.id);
            const propertyPayments = paidPayments.filter((payment: any) => payment.propertyId === property.id);

            const expectedRent = propertyLeases.reduce((sum, lease) => sum + lease.rentAmount, 0);
            const collectedRent = propertyPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);

            return {
                propertyId: property.id,
                propertyName: property.name,
                expectedRent,
                collectedRent,
                collectionRate: expectedRent > 0 ? Math.round((collectedRent / expectedRent) * 100) : 0
            };
        });

        // Recent payments
        const recentPayments = paidPayments.slice(0, 10).map((payment: any) => ({
            id: payment.id,
            amount: payment.amount,
            paymentDate: payment.paymentDate.toISOString(),
            tenantName: payment.tenantIdentity?.name || 'Unknown',
            propertyName: payment.property.name,
            unitNumber: payment.unit?.unitNumber || 'N/A',
            status: payment.status
        }));

        return {
            totalCollected,
            period: targetPeriod,
            byProperty,
            recentPayments
        };

    } catch (error) {
        console.error('Error getting rent collection data:', error);
        throw error;
    }
};

export const getOutstandingRentData = async (
    managerId: string,
    period?: string,
    propertyId?: string
): Promise<OutstandingRentData> => {
    try {
        const targetPeriod = period || getCurrentBillingPeriod();
        const { periodStart } = getPeriodDates(targetPeriod);

        // Get properties owned by this manager
        const ownedProperties = await prisma.property.findMany({
            where: {
                managerId,
                ...(propertyId && { id: propertyId })
            },
            select: { id: true }
        });

        const propertyIds = ownedProperties.map(p => p.id);

        if (propertyIds.length === 0) {
            return {
                totalOutstanding: 0,
                overdueTenantsCount: 0,
                period: targetPeriod,
                items: []
            };
        }

        // Get active leases at period start (Option A snapshot semantics)
        const activeLeases = await prisma.lease.findMany({
            where: {
                propertyId: { in: propertyIds },
                status: 'ACTIVE',
                startDate: { lte: periodStart },
                OR: [
                    { endDate: null },
                    { endDate: { gte: periodStart } }
                ]
            },
            include: {
                property: { select: { id: true, name: true } },
                unit: { select: { id: true, unitNumber: true } },
                tenantIdentity: {
                    select: {
                        name: true,
                        tenantId: true,
                        phoneNumber: true
                    }
                }
            }
        });

        // For each lease, calculate outstanding amount
        const outstandingItems = await Promise.all(
            activeLeases.map(async (lease) => {
                // Get PAID payments for this tenant for the billing period
                const paidPayments = await (prisma as any).payment.findMany({
                    where: {
                        tenantId: lease.tenantId,
                        propertyId: lease.propertyId,
                        unitId: lease.unitId,
                        status: 'PAID',
                        billingPeriod: targetPeriod
                    },
                    orderBy: { paymentDate: 'desc' }
                });

                const collectedRent = paidPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
                const expectedRent = lease.rentAmount;
                const amountOutstanding = Math.max(0, expectedRent - collectedRent);

                return {
                    tenantId: lease.tenantId,
                    tenantName: lease.tenantIdentity?.name || 'Unknown',
                    tenantPhone: lease.tenantIdentity?.phoneNumber || null,
                    propertyId: lease.propertyId,
                    propertyName: lease.property.name,
                    unitId: lease.unitId,
                    unitNumber: lease.unit?.unitNumber || 'N/A',
                    leaseId: lease.id,
                    expectedRent,
                    collectedRent,
                    amountOutstanding,
                    lastPaymentAt: paidPayments[0]?.paymentDate.toISOString() || null
                };
            })
        );

        // Filter to only items with outstanding amounts
        const itemsWithOutstanding = outstandingItems.filter(item => item.amountOutstanding > 0);

        const totalOutstanding = itemsWithOutstanding.reduce((sum, item) => sum + item.amountOutstanding, 0);
        const overdueTenantsCount = itemsWithOutstanding.length;

        return {
            totalOutstanding,
            overdueTenantsCount,
            period: targetPeriod,
            items: itemsWithOutstanding
        };

    } catch (error) {
        console.error('Error getting outstanding rent data:', error);
        throw error;
    }
};

export const getCashflowStatementData = async (
    managerId: string,
    period?: string,
    propertyId?: string
): Promise<CashflowStatementData> => {
    try {
        const targetPeriod = period || getCurrentBillingPeriod();
        const { periodStart, periodEnd } = getPeriodDates(targetPeriod);

        // Get manager's properties
        const whereClause: any = { managerId };
        if (propertyId) {
            whereClause.id = propertyId;
        }

        const ownedProperties = await prisma.property.findMany({
            where: whereClause,
            select: { id: true }
        });

        const propertyIds = ownedProperties.map(p => p.id);

        if (propertyIds.length === 0) {
            return {
                period: targetPeriod,
                operatingActivities: {
                    inflows: {
                        rentCollected: 0,
                        description: "Rent payments received during period"
                    },
                    outflows: {
                        expenses: 0,
                        description: "Not tracked yet"
                    },
                    netOperatingCashflow: 0
                },
                investingActivities: {
                    inflows: 0,
                    outflows: 0,
                    netInvestingCashflow: 0,
                    description: "Not tracked yet"
                },
                financingActivities: {
                    inflows: 0,
                    outflows: 0,
                    netFinancingCashflow: 0,
                    description: "Not tracked yet"
                },
                netCashflow: 0,
                disclaimer: "Simplified cashflow based on rent collections only. Expenses, investments, and financing activities not yet tracked."
            };
        }

        // Get rent collected during the period (based on paymentDate, not billingPeriod)
        const rentCollected = await (prisma as any).payment.aggregate({
            where: {
                propertyId: { in: propertyIds },
                status: 'PAID',
                paymentDate: {
                    gte: periodStart,
                    lte: periodEnd
                }
            },
            _sum: { amount: true }
        });

        const totalRentCollected = rentCollected._sum.amount || 0;

        return {
            period: targetPeriod,
            operatingActivities: {
                inflows: {
                    rentCollected: totalRentCollected,
                    description: "Rent payments received during period"
                },
                outflows: {
                    expenses: 0,
                    description: "Not tracked yet"
                },
                netOperatingCashflow: totalRentCollected
            },
            investingActivities: {
                inflows: 0,
                outflows: 0,
                netInvestingCashflow: 0,
                description: "Not tracked yet"
            },
            financingActivities: {
                inflows: 0,
                outflows: 0,
                netFinancingCashflow: 0,
                description: "Not tracked yet"
            },
            netCashflow: totalRentCollected,
            disclaimer: "Simplified cashflow based on rent collections only. Expenses, investments, and financing activities not yet tracked."
        };

    } catch (error) {
        console.error('Error getting cashflow statement data:', error);
        throw error;
    }
};

export const getIncomeStatementData = async (
    managerId: string,
    period?: string,
    propertyId?: string
): Promise<IncomeStatementData> => {
    try {
        const targetPeriod = period || getCurrentBillingPeriod();
        const { periodStart, periodEnd } = getPeriodDates(targetPeriod);

        // Get manager's properties
        const whereClause: any = { managerId };
        if (propertyId) {
            whereClause.id = propertyId;
        }

        const ownedProperties = await prisma.property.findMany({
            where: whereClause,
            select: { id: true }
        });

        const propertyIds = ownedProperties.map(p => p.id);

        if (propertyIds.length === 0) {
            return {
                period: targetPeriod,
                revenue: {
                    rentIncome: 0,
                    otherIncome: 0,
                    totalRevenue: 0
                },
                expenses: {
                    operatingExpenses: 0,
                    maintenanceExpenses: 0,
                    administrativeExpenses: 0,
                    totalExpenses: 0,
                    description: "Expenses not tracked yet"
                },
                netIncome: 0,
                disclaimer: "Income statement based on rent collections only. Operating expenses not yet tracked."
            };
        }

        // Get rent income (based on paymentDate during period)
        const rentIncome = await (prisma as any).payment.aggregate({
            where: {
                propertyId: { in: propertyIds },
                status: 'PAID',
                paymentDate: {
                    gte: periodStart,
                    lte: periodEnd
                }
            },
            _sum: { amount: true }
        });

        const totalRentIncome = rentIncome._sum.amount || 0;

        return {
            period: targetPeriod,
            revenue: {
                rentIncome: totalRentIncome,
                otherIncome: 0,
                totalRevenue: totalRentIncome
            },
            expenses: {
                operatingExpenses: 0,
                maintenanceExpenses: 0,
                administrativeExpenses: 0,
                totalExpenses: 0,
                description: "Expenses not tracked yet"
            },
            netIncome: totalRentIncome,
            disclaimer: "Income statement based on rent collections only. Operating expenses not yet tracked."
        };

    } catch (error) {
        console.error('Error getting income statement data:', error);
        throw error;
    }
};

export const getFinancialPositionData = async (
    managerId: string,
    period?: string,
    propertyId?: string
): Promise<FinancialPositionData> => {
    try {
        const targetPeriod = period || getCurrentBillingPeriod();
        const { periodStart, periodEnd } = getPeriodDates(targetPeriod);

        // Get manager's properties
        const whereClause: any = { managerId };
        if (propertyId) {
            whereClause.id = propertyId;
        }

        const ownedProperties = await prisma.property.findMany({
            where: whereClause,
            select: { id: true }
        });

        const propertyIds = ownedProperties.map(p => p.id);

        if (propertyIds.length === 0) {
            return {
                period: targetPeriod,
                assets: {
                    current: {
                        cashReceivedInPeriod: 0,
                        rentReceivableForPeriod: 0,
                        totalCurrentAssets: 0
                    },
                    nonCurrent: {
                        propertyPlantEquipment: 0,
                        totalNonCurrentAssets: 0,
                        description: "Not tracked yet"
                    },
                    totalAssets: 0
                },
                liabilities: {
                    current: {
                        accountsPayable: 0,
                        totalCurrentLiabilities: 0
                    },
                    nonCurrent: {
                        longTermDebt: 0,
                        totalNonCurrentLiabilities: 0
                    },
                    totalLiabilities: 0,
                    description: "Liabilities not tracked yet"
                },
                equity: {
                    retainedEarnings: 0,
                    totalEquity: 0
                },
                disclaimer: "Simplified financial position. Assets show period cash received and outstanding receivables. Liabilities and detailed equity not yet tracked."
            };
        }

        // Get cash received in period (based on paymentDate)
        const cashReceived = await (prisma as any).payment.aggregate({
            where: {
                propertyId: { in: propertyIds },
                status: 'PAID',
                paymentDate: {
                    gte: periodStart,
                    lte: periodEnd
                }
            },
            _sum: { amount: true }
        });

        const cashReceivedInPeriod = cashReceived._sum.amount || 0;

        // Get outstanding rent for the period (using existing logic)
        const outstandingData = await getOutstandingRentData(managerId, targetPeriod, propertyId);
        const rentReceivableForPeriod = outstandingData.totalOutstanding;

        const totalCurrentAssets = cashReceivedInPeriod + rentReceivableForPeriod;

        return {
            period: targetPeriod,
            assets: {
                current: {
                    cashReceivedInPeriod,
                    rentReceivableForPeriod,
                    totalCurrentAssets
                },
                nonCurrent: {
                    propertyPlantEquipment: 0,
                    totalNonCurrentAssets: 0,
                    description: "Not tracked yet"
                },
                totalAssets: totalCurrentAssets
            },
            liabilities: {
                current: {
                    accountsPayable: 0,
                    totalCurrentLiabilities: 0
                },
                nonCurrent: {
                    longTermDebt: 0,
                    totalNonCurrentLiabilities: 0
                },
                totalLiabilities: 0,
                description: "Liabilities not tracked yet"
            },
            equity: {
                retainedEarnings: totalCurrentAssets,
                totalEquity: totalCurrentAssets
            },
            disclaimer: "Simplified financial position. Assets show period cash received and outstanding receivables. Liabilities and detailed equity not yet tracked."
        };

    } catch (error) {
        console.error('Error getting financial position data:', error);
        throw error;
    }
};
