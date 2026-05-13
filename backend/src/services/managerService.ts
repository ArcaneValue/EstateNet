import { prisma } from '../utils/database';
import { RentService } from './rentService';

export interface DashboardData {
    propertiesCount: number;
    unitsCount: number;
    occupiedUnitsCount: number;
    occupancyRate: number;
    activeLeasesCount: number;
    pendingInvitationsCount: number;
    outstandingRentAmount: number;
    overdueCount: number;
    rentCollectedAmount: number;
    recentInvitations: Array<{
        id: string;
        tenantId: string;
        status: string;
        createdAt: Date;
        respondedAt: Date | null;
        property: {
            name: string;
            location: string | null;
        };
        unit: {
            unitNumber: string;
        };
    }>;
    recentPayments: Array<{
        id: string;
        amount: number;
        status: string;
        paymentDate: Date;
        tenantId: string;
        property: {
            name: string;
        };
        unit: {
            unitNumber: string;
        };
    }>;
}

export interface ManagerLeasesFilters {
    propertyId?: string;
    status?: string;
}

export interface ManagerInvitationsFilters {
    propertyId?: string;
    status?: string;
}

export const getDashboardData = async (managerId: string): Promise<DashboardData> => {
    try {
        // Get properties owned by this manager
        const ownedProperties = await prisma.property.findMany({
            where: { managerId },
            select: { id: true }
        });

        const propertyIds = ownedProperties.map(p => p.id);

        // Get properties with units and leases
        const properties = await prisma.property.findMany({
            where: {
                id: { in: propertyIds }
            },
            include: {
                units: {
                    include: {
                        leases: { where: { status: 'ACTIVE' } }
                    }
                }
            }
        });

        const propertiesCount = properties.length;
        const unitsCount = properties.reduce((sum: number, prop: any) => sum + prop.units.length, 0);
        const occupiedUnitsCount = properties.reduce((sum: number, prop: any) =>
            sum + prop.units.filter((unit: any) => unit.isOccupied).length, 0
        );
        const activeLeasesCount = properties.reduce((sum: number, prop: any) =>
            sum + prop.units.reduce((unitSum: number, unit: any) => unitSum + unit.leases.length, 0), 0
        );

        const occupancyRate = unitsCount > 0 ? (occupiedUnitsCount / unitsCount) * 100 : 0;

        // Get pending invitations for manager's properties
        const pendingInvitationsCount = await prisma.tenantInvitation.count({
            where: {
                propertyId: { in: propertyIds },
                status: 'PENDING'
            }
        });

        // Get outstanding rent and overdue count
        const now = new Date();

        // OVERDUE payments
        const overduePayments = await prisma.payment.findMany({
            where: {
                propertyId: { in: propertyIds },
                status: 'OVERDUE'
            },
            select: { amount: true, tenantId: true }
        });

        // PENDING payments past due date
        const pendingOverduePayments = await prisma.payment.findMany({
            where: {
                propertyId: { in: propertyIds },
                status: 'PENDING',
                dueDate: { lt: now }
            },
            select: { amount: true, tenantId: true }
        });

        const outstandingRentAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0) +
            pendingOverduePayments.reduce((sum, p) => sum + p.amount, 0);

        const uniqueOverdueTenants = new Set([
            ...overduePayments.map(p => p.tenantId),
            ...pendingOverduePayments.map(p => p.tenantId)
        ]);
        const overdueCount = uniqueOverdueTenants.size;

        // Get recent invitations for manager's properties
        const recentInvitations = await prisma.tenantInvitation.findMany({
            where: { propertyId: { in: propertyIds } },
            include: {
                property: { select: { name: true, location: true } },
                unit: { select: { unitNumber: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        // Get recent payments for manager's properties
        const recentPayments = await prisma.payment.findMany({
            where: { propertyId: { in: propertyIds } },
            include: {
                property: { select: { name: true } },
                unit: { select: { unitNumber: true } }
            },
            orderBy: { paymentDate: 'desc' },
            take: 10
        });

        // Calculate rent collected amount (PAID payments)
        const paidPayments = await prisma.payment.findMany({
            where: {
                propertyId: { in: propertyIds },
                status: 'PAID'
            },
            select: { amount: true }
        });
        const rentCollectedAmount = paidPayments.reduce((sum, p) => sum + p.amount, 0);

        return {
            propertiesCount,
            unitsCount,
            occupiedUnitsCount,
            occupancyRate,
            activeLeasesCount,
            pendingInvitationsCount,
            outstandingRentAmount,
            overdueCount,
            rentCollectedAmount,
            recentInvitations: recentInvitations.map((inv: any) => ({
                id: inv.id,
                tenantId: inv.tenantId,
                status: inv.status,
                createdAt: inv.createdAt,
                respondedAt: inv.respondedAt,
                property: inv.property,
                unit: inv.unit
            })),
            recentPayments: recentPayments.map((payment: any) => ({
                id: payment.id,
                amount: payment.amount,
                status: payment.status,
                paymentDate: payment.paymentDate,
                tenantId: payment.tenantId,
                property: payment.property,
                unit: payment.unit
            }))
        };
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        throw error;
    }
};

export const getManagerLeases = async (managerId: string, filters: ManagerLeasesFilters) => {
    try {
        // Get properties this manager manages
        const managerProperties = await prisma.tenantInvitation.findMany({
            where: {
                invitedByUserId: managerId
            },
            select: {
                propertyId: true
            },
            distinct: ['propertyId']
        });

        const propertyIds = managerProperties.map(inv => inv.propertyId);

        const leases = await prisma.lease.findMany({
            where: {
                propertyId: {
                    in: propertyIds
                },
                ...(filters.propertyId && { propertyId: filters.propertyId }),
                ...(filters.status && { status: filters.status as any })
            },
            include: {
                tenantIdentity: {
                    select: {
                        name: true,
                        email: true,
                        tenantId: true
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

        return leases;
    } catch (error) {
        console.error('Error getting manager leases:', error);
        throw error;
    }
};

export const getManagerInvitations = async (managerId: string, filters: ManagerInvitationsFilters) => {
    try {
        const invitations = await prisma.tenantInvitation.findMany({
            where: {
                invitedByUserId: managerId,
                ...(filters.propertyId && { propertyId: filters.propertyId }),
                ...(filters.status && { status: filters.status as any })
            },
            include: {
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
                },
                tenantIdentity: {
                    select: {
                        name: true,
                        email: true,
                        tenantId: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return invitations;
    } catch (error) {
        console.error('Error getting manager invitations:', error);
        throw error;
    }
};

// GET: Get all tenants with active leases for this manager
export const getAllTenants = async (managerId: string) => {
    try {
        // Get properties this manager manages
        const managerProperties = await prisma.tenantInvitation.findMany({
            where: {
                invitedByUserId: managerId,
            },
            select: {
                propertyId: true,
            },
            distinct: ['propertyId'],
        });

        const propertyIds = managerProperties.map((inv) => inv.propertyId);

        // Get all active leases for these properties
        const leases = await prisma.lease.findMany({
            where: {
                propertyId: {
                    in: propertyIds,
                },
                status: 'ACTIVE',
            },
            include: {
                tenantIdentity: {
                    select: {
                        name: true,
                        email: true,
                        phoneNumber: true,
                        tenantId: true,
                    },
                },
                property: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
                unit: {
                    select: {
                        id: true,
                        unitNumber: true,
                    },
                },
            },
        });

        // Get payment status for each tenant using RentService
        const rentService = new RentService();
        const tenantsWithPayments = await Promise.all(
            leases.map(async (lease) => {
                // Get accurate rent status from RentService
                let paymentStatus: 'current' | 'overdue' = 'current';
                let amountOwed = 0;

                try {
                    const rentStatus = await rentService.getTenantRentStatus(lease.tenantId);

                    // Map RentService status to manager display status
                    // PAID, NOT_DUE, PARTIAL -> 'current'
                    // OVERDUE, DUE (if past due date) -> 'overdue'
                    if (rentStatus.status === 'OVERDUE') {
                        paymentStatus = 'overdue';
                        amountOwed = rentStatus.amountDueForPeriod - rentStatus.totalPaidForPeriod + (rentStatus.arrearsTotal || 0);
                    } else if (rentStatus.status === 'PARTIAL') {
                        // Partial payment - show as current but with amount owed
                        paymentStatus = 'current';
                        amountOwed = rentStatus.amountDueForPeriod - rentStatus.totalPaidForPeriod;
                    } else {
                        // PAID, NOT_DUE, NO_LEASE
                        paymentStatus = 'current';
                        amountOwed = 0;
                    }
                } catch (error) {
                    console.error(`Error getting rent status for tenant ${lease.tenantId}:`, error);
                    // Fallback to simple check if RentService fails
                    const overduePayments = await prisma.payment.findMany({
                        where: {
                            tenantId: lease.tenantId,
                            status: 'OVERDUE',
                        },
                    });
                    paymentStatus = overduePayments.length > 0 ? 'overdue' : 'current';
                    amountOwed = overduePayments.reduce((sum, p) => sum + p.amount, 0);
                }

                return {
                    id: lease.id,
                    tenantId: lease.tenantIdentity.tenantId,
                    name: lease.tenantIdentity.name,
                    email: lease.tenantIdentity.email,
                    phoneNumber: lease.tenantIdentity.phoneNumber || '',
                    propertyId: lease.propertyId,
                    propertyName: lease.property.name,
                    unitId: lease.unitId,
                    unitNumber: lease.unit.unitNumber,
                    rentAmount: lease.rentAmount,
                    paymentStatus,
                    amountOwed,
                    leaseId: lease.id,
                };
            }),
        );

        return tenantsWithPayments;
    } catch (error) {
        console.error('Error getting all tenants:', error);
        throw error;
    }
};

// GET: Get specific tenant by tenantId
export const getTenantById = async (
    managerId: string,
    tenantId: string,
) => {
    try {
        // Get properties this manager manages
        const managerProperties = await prisma.tenantInvitation.findMany({
            where: {
                invitedByUserId: managerId,
            },
            select: {
                propertyId: true,
            },
            distinct: ['propertyId'],
        });

        const propertyIds = managerProperties.map((inv) => inv.propertyId);

        // Find active lease for this tenant in manager's properties
        const lease = await prisma.lease.findFirst({
            where: {
                tenantId,
                propertyId: {
                    in: propertyIds,
                },
                status: 'ACTIVE',
            },
            include: {
                tenantIdentity: {
                    select: {
                        name: true,
                        email: true,
                        phoneNumber: true,
                        tenantId: true,
                    },
                },
                property: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
                unit: {
                    select: {
                        id: true,
                        unitNumber: true,
                    },
                },
            },
        });

        if (!lease) {
            return null;
        }

        // Get accurate payment status using RentService
        const rentService = new RentService();
        let paymentStatus: 'current' | 'overdue' = 'current';
        let amountOwed = 0;

        try {
            const rentStatus = await rentService.getTenantRentStatus(lease.tenantId);

            if (rentStatus.status === 'OVERDUE') {
                paymentStatus = 'overdue';
                amountOwed = rentStatus.amountDueForPeriod - rentStatus.totalPaidForPeriod + (rentStatus.arrearsTotal || 0);
            } else if (rentStatus.status === 'PARTIAL') {
                paymentStatus = 'current';
                amountOwed = rentStatus.amountDueForPeriod - rentStatus.totalPaidForPeriod;
            } else {
                paymentStatus = 'current';
                amountOwed = 0;
            }
        } catch (error) {
            console.error(`Error getting rent status for tenant ${lease.tenantId}:`, error);
            // Fallback
            const overduePayments = await prisma.payment.findMany({
                where: {
                    tenantId: lease.tenantId,
                    status: 'OVERDUE',
                },
            });
            paymentStatus = overduePayments.length > 0 ? 'overdue' : 'current';
            amountOwed = overduePayments.reduce((sum, p) => sum + p.amount, 0);
        }

        return {
            id: lease.id,
            tenantId: lease.tenantIdentity.tenantId,
            name: lease.tenantIdentity.name,
            email: lease.tenantIdentity.email,
            phoneNumber: lease.tenantIdentity.phoneNumber || '',
            propertyId: lease.propertyId,
            propertyName: lease.property.name,
            unitId: lease.unitId,
            unitNumber: lease.unit.unitNumber,
            rentAmount: lease.rentAmount,
            paymentStatus,
            amountOwed,
            leaseId: lease.id,
        };
    } catch (error) {
        console.error('Error getting tenant by ID:', error);
        throw error;
    }
};

// GET: Get tenants by property
export const getTenantsByProperty = async (
    managerId: string,
    propertyId: string,
) => {
    try {
        // Verify manager has access to this property
        const hasAccess = await prisma.tenantInvitation.findFirst({
            where: {
                invitedByUserId: managerId,
                propertyId,
            },
        });

        if (!hasAccess) {
            throw new Error('No access to this property');
        }

        // Get all active leases for this property
        const leases = await prisma.lease.findMany({
            where: {
                propertyId,
                status: 'ACTIVE',
            },
            include: {
                tenantIdentity: {
                    select: {
                        name: true,
                        email: true,
                        phoneNumber: true,
                        tenantId: true,
                    },
                },
                property: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
                unit: {
                    select: {
                        id: true,
                        unitNumber: true,
                    },
                },
            },
        });

        const rentService = new RentService();
        const tenantsWithPayments = await Promise.all(
            leases.map(async (lease) => {
                let paymentStatus: 'current' | 'overdue' = 'current';
                let amountOwed = 0;

                try {
                    const rentStatus = await rentService.getTenantRentStatus(lease.tenantId);

                    if (rentStatus.status === 'OVERDUE') {
                        paymentStatus = 'overdue';
                        amountOwed = rentStatus.amountDueForPeriod - rentStatus.totalPaidForPeriod + (rentStatus.arrearsTotal || 0);
                    } else if (rentStatus.status === 'PARTIAL') {
                        paymentStatus = 'current';
                        amountOwed = rentStatus.amountDueForPeriod - rentStatus.totalPaidForPeriod;
                    } else {
                        paymentStatus = 'current';
                        amountOwed = 0;
                    }
                } catch (error) {
                    console.error(`Error getting rent status for tenant ${lease.tenantId}:`, error);
                    const overduePayments = await prisma.payment.findMany({
                        where: {
                            tenantId: lease.tenantId,
                            status: 'OVERDUE',
                        },
                    });
                    paymentStatus = overduePayments.length > 0 ? 'overdue' : 'current';
                    amountOwed = overduePayments.reduce((sum, p) => sum + p.amount, 0);
                }

                return {
                    id: lease.id,
                    tenantId: lease.tenantIdentity.tenantId,
                    name: lease.tenantIdentity.name,
                    email: lease.tenantIdentity.email,
                    phoneNumber: lease.tenantIdentity.phoneNumber || '',
                    propertyId: lease.propertyId,
                    propertyName: lease.property.name,
                    unitId: lease.unitId,
                    unitNumber: lease.unit.unitNumber,
                    rentAmount: lease.rentAmount,
                    paymentStatus,
                    amountOwed,
                    leaseId: lease.id,
                };
            }),
        );

        return tenantsWithPayments;
    } catch (error) {
        console.error('Error getting tenants by property:', error);
        throw error;
    }
};

// GET: Get overdue tenants
export const getOverdueTenants = async (managerId: string) => {
    try {
        // Get all tenants first
        const allTenants = await getAllTenants(managerId);

        // Filter for overdue tenants
        return allTenants.filter(
            (tenant) => tenant.paymentStatus === 'overdue' && tenant.amountOwed > 0,
        );
    } catch (error) {
        console.error('Error getting overdue tenants:', error);
        throw error;
    }
};

// POST: Create invitation
export interface CreateInvitationData {
    tenantId: string;
    propertyId: string;
    unitId: string;
    rentAmount: number;
}

export const createInvitation = async (
    managerId: string,
    data: CreateInvitationData,
) => {
    try {
        // Verify tenant identity exists
        const tenantIdentity = await prisma.tenantIdentity.findUnique({
            where: { tenantId: data.tenantId },
        });

        if (!tenantIdentity) {
            throw new Error('Tenant not found');
        }

        // Verify unit exists and is not occupied (check for ACTIVE lease)
        const unit = await prisma.unit.findUnique({
            where: { id: data.unitId },
            include: {
                leases: {
                    where: { status: 'ACTIVE' },
                    select: { id: true }
                }
            }
        });

        if (!unit) {
            throw new Error('Unit not found');
        }

        if (unit.leases.length > 0) {
            throw new Error('Unit is already occupied');
        }

        // Check if invitation already exists
        const existingInvitation = await prisma.tenantInvitation.findFirst({
            where: {
                tenantId: data.tenantId,
                propertyId: data.propertyId,
                unitId: data.unitId,
                status: 'PENDING',
            },
        });

        if (existingInvitation) {
            throw new Error('Invitation already exists');
        }

        // Create invitation
        const invitation = await prisma.tenantInvitation.create({
            data: {
                tenantId: data.tenantId,
                propertyId: data.propertyId,
                unitId: data.unitId,
                rentAmount: data.rentAmount,
                invitedByUserId: managerId,
                status: 'PENDING',
            },
            include: {
                property: {
                    select: {
                        name: true,
                        location: true,
                    },
                },
                unit: {
                    select: {
                        unitNumber: true,
                    },
                },
                tenantIdentity: {
                    select: {
                        name: true,
                        email: true,
                        tenantId: true,
                    },
                },
            },
        });

        return invitation;
    } catch (error) {
        console.error('Error creating invitation:', error);
        throw error;
    }
};

