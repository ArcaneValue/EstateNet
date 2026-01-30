import { prisma } from '../utils/database';

// Type assertions for the new models
type Lease = any;
type TenantInvitation = any;
type LeaseStatus = any;
type InvitationStatus = any;

export interface CreateInvitationData {
  tenantId: string;
  propertyId: string;
  unitId: string;
  rentAmount: number;
  invitedByUserId: string;
}

export interface CreateLeaseData {
  tenantId: string;
  propertyId: string;
  unitId: string;
  rentAmount: number;
}

export class TenantService {
  async createInvitation(data: CreateInvitationData): Promise<TenantInvitation> {
    return await (prisma as any).tenantInvitation.create({
      data: {
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        unitId: data.unitId,
        rentAmount: data.rentAmount,
        invitedByUserId: data.invitedByUserId
      },
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

  async getInvitationById(id: string): Promise<TenantInvitation | null> {
    return await (prisma as any).tenantInvitation.findUnique({
      where: { id },
      include: {
        tenantIdentity: true,
        property: true,
        unit: true
      }
    });
  }

  async getInvitationsByTenant(tenantId: string): Promise<TenantInvitation[]> {
    return await (prisma as any).tenantInvitation.findMany({
      where: { tenantId },
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
        }
      }
    });
  }

  async acceptInvitation(invitationId: string): Promise<Lease> {
    return await (prisma as any).$transaction(async (tx: any) => {
      // Get invitation with related data
      const invitation = await tx.tenantInvitation.findUnique({
        where: { id: invitationId },
        include: {
          unit: true,
          property: true,
          tenantIdentity: true
        }
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Validate invitation status
      if (invitation.status !== 'PENDING') {
        throw new Error('Invitation is no longer pending');
      }

      // Validate unit availability
      if (invitation.unit.isOccupied) {
        throw new Error('Unit is already occupied');
      }

      // Check if tenant already has an active lease
      const existingLease = await tx.lease.findFirst({
        where: {
          tenantId: invitation.tenantId,
          status: 'ACTIVE'
        }
      });

      if (existingLease) {
        throw new Error('Tenant already has an active lease');
      }

      // Create lease
      const lease = await tx.lease.create({
        data: {
          tenantId: invitation.tenantId,
          propertyId: invitation.propertyId,
          unitId: invitation.unitId,
          rentAmount: invitation.rentAmount
        },
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

      // Update unit status
      await tx.unit.update({
        where: { id: invitation.unitId },
        data: { isOccupied: true }
      });

      // Update invitation status
      await tx.tenantInvitation.update({
        where: { id: invitationId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date()
        }
      });

      return lease;
    });
  }

  async declineInvitation(invitationId: string): Promise<TenantInvitation> {
    // Get invitation with tenant validation
    const invitation = await (prisma as any).tenantInvitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Validate invitation status
    if (invitation.status !== 'PENDING') {
      throw new Error('Invitation is no longer pending');
    }

    return await (prisma as any).tenantInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'DECLINED',
        respondedAt: new Date()
      }
    });
  }

  async createLease(data: CreateLeaseData): Promise<Lease> {
    return await (prisma as any).lease.create({
      data: {
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        unitId: data.unitId,
        rentAmount: data.rentAmount
      },
      include: {
        tenantIdentity: true,
        property: true,
        unit: true
      }
    });
  }

  async getActiveLeaseByTenant(tenantId: string): Promise<Lease | null> {
    return await (prisma as any).lease.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE'
      },
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

  async endLease(leaseId: string, reason: string = 'ENDED'): Promise<Lease> {
    // Get lease to check if it's active
    const lease = await (prisma as any).lease.findUnique({
      where: { id: leaseId },
      include: { unit: true }
    });

    if (!lease) {
      throw new Error('Lease not found');
    }

    // Update lease
    const updatedLease = await (prisma as any).lease.update({
      where: { id: leaseId },
      data: {
        status: reason,
        endDate: new Date()
      },
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

    // If this was the active lease, update unit status
    if (lease.status === 'ACTIVE') {
      await (prisma as any).unit.update({
        where: { id: lease.unitId },
        data: { isOccupied: false }
      });
    }

    return updatedLease;
  }

  async getLeaseById(id: string): Promise<Lease | null> {
    return await (prisma as any).lease.findUnique({
      where: { id },
      include: {
        tenantIdentity: true,
        property: true,
        unit: true
      }
    });
  }
}
