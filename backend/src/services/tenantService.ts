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
  startDate?: string;
}

export class TenantService {
  async createInvitation(data: CreateInvitationData): Promise<TenantInvitation> {
    // Check if tenant already has an active lease for this unit
    const existingLease = await (prisma as any).lease.findFirst({
      where: {
        tenantId: data.tenantId,
        unitId: data.unitId,
        status: 'ACTIVE'
      }
    });

    if (existingLease) {
      throw new Error('This tenant already has an active lease for this unit');
    }

    // Check if tenant already has a pending invitation for this unit
    const existingInvitation = await (prisma as any).tenantInvitation.findFirst({
      where: {
        tenantId: data.tenantId,
        unitId: data.unitId,
        status: 'PENDING'
      }
    });

    if (existingInvitation) {
      throw new Error('This tenant already has a pending invitation for this unit');
    }

    // Check if the unit is already occupied by another tenant
    const unitOccupied = await (prisma as any).lease.findFirst({
      where: {
        unitId: data.unitId,
        status: 'ACTIVE'
      }
    });

    if (unitOccupied) {
      throw new Error('This unit is already occupied by another tenant');
    }

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

      // Validate unit availability - check for ACTIVE lease
      const unitOccupancyCheck = await tx.lease.findFirst({
        where: {
          unitId: invitation.unitId,
          status: 'ACTIVE'
        }
      });
      if (unitOccupancyCheck) {
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

  async cancelInvitation(invitationId: string, managerId: string): Promise<TenantInvitation> {
    // Get invitation with property to verify ownership
    const invitation = await (prisma as any).tenantInvitation.findUnique({
      where: { id: invitationId },
      include: {
        property: {
          select: {
            managerId: true
          }
        }
      }
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Verify the manager owns the property
    if (invitation.property?.managerId !== managerId) {
      throw new Error('You can only cancel invitations for your own properties');
    }

    // Validate invitation status - can only cancel PENDING invitations
    if (invitation.status === 'ACCEPTED') {
      throw new Error('Cannot cancel an already accepted invitation');
    }

    if (invitation.status === 'DECLINED') {
      throw new Error('Cannot cancel an already declined invitation');
    }

    // Only PENDING can be cancelled
    if (invitation.status !== 'PENDING') {
      throw new Error(`Cannot cancel invitation with status: ${invitation.status}. Only PENDING invitations can be cancelled.`);
    }

    // Use Prisma client to update - schema now has CANCELLED enum
    return await (prisma as any).tenantInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'CANCELLED',
        respondedAt: new Date()
      },
      include: {
        tenantIdentity: { select: { name: true, email: true, tenantId: true } },
        property: { select: { name: true, location: true } },
        unit: { select: { unitNumber: true } }
      }
    });
  }

  async createLease(data: CreateLeaseData): Promise<Lease> {
    console.log('TenantService: createLease called with:', data);

    try {
      // Verify tenant exists first
      const tenant = await (prisma as any).tenantIdentity.findUnique({
        where: { tenantId: data.tenantId }
      });

      if (!tenant) {
        throw new Error(`Tenant with ID ${data.tenantId} not found`);
      }

      console.log('TenantService: Tenant verified:', tenant);

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: data.tenantId,
          propertyId: data.propertyId,
          unitId: data.unitId,
          rentAmount: data.rentAmount,
          startDate: data.startDate ? new Date(data.startDate) : new Date()
        },
        include: {
          tenantIdentity: true,
          property: true,
          unit: true
        }
      });

      console.log('TenantService: Lease created successfully:', lease);
      return lease;
    } catch (error) {
      console.error('TenantService: createLease error:', error);
      throw error;
    }
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
