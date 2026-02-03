import { prisma } from '../utils/database';
import { InvitationStatus } from '../types/prisma';

export class OwnerInvitationService {
    // Owner creates invitation for a manager
    async createInvitation(data: {
        propertyId: string;
        ownerId: string;
        managerEmail: string;
    }) {
        // Verify property belongs to owner
        const property = await prisma.property.findFirst({
            where: {
                id: data.propertyId,
                ownerId: data.ownerId
            }
        });

        if (!property) {
            throw new Error('Property not found or you do not own this property');
        }

        // Check if invitation already exists
        const existingInvitation = await prisma.ownerManagerInvitation.findFirst({
            where: {
                propertyId: data.propertyId,
                managerEmail: data.managerEmail,
                status: 'PENDING'
            }
        });

        if (existingInvitation) {
            throw new Error('Invitation already pending for this manager');
        }

        const invitation = await prisma.ownerManagerInvitation.create({
            data: {
                propertyId: data.propertyId,
                ownerId: data.ownerId,
                managerEmail: data.managerEmail,
                status: 'PENDING'
            },
            include: {
                property: {
                    select: {
                        name: true,
                        location: true
                    }
                },
                owner: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        return invitation;
    }

    // Owner lists their invitations
    async getOwnerInvitations(ownerId: string) {
        const invitations = await prisma.ownerManagerInvitation.findMany({
            where: {
                ownerId
            },
            include: {
                property: {
                    select: {
                        name: true,
                        location: true
                    }
                },
                manager: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return invitations;
    }

    // Owner cancels/deletes invitation
    async cancelInvitation(invitationId: string, ownerId: string) {
        const invitation = await prisma.ownerManagerInvitation.findFirst({
            where: {
                id: invitationId,
                ownerId
            }
        });

        if (!invitation) {
            throw new Error('Invitation not found');
        }

        await prisma.ownerManagerInvitation.delete({
            where: { id: invitationId }
        });

        return { success: true };
    }

    // Manager lists invitations sent to their email
    async getManagerInvitations(managerEmail: string) {
        const invitations = await prisma.ownerManagerInvitation.findMany({
            where: {
                managerEmail,
                status: 'PENDING'
            },
            include: {
                property: {
                    select: {
                        name: true,
                        location: true
                    }
                },
                owner: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return invitations;
    }

    // Manager accepts invitation
    async acceptInvitation(invitationId: string, managerId: string, managerEmail: string) {
        const invitation = await prisma.ownerManagerInvitation.findFirst({
            where: {
                id: invitationId,
                managerEmail,
                status: 'PENDING'
            },
            include: {
                property: true
            }
        });

        if (!invitation) {
            throw new Error('Invitation not found or already processed');
        }

        // Update invitation status
        await prisma.ownerManagerInvitation.update({
            where: { id: invitationId },
            data: {
                status: 'ACCEPTED',
                respondedAt: new Date(),
                managerId
            }
        });

        // Assign manager to property
        await prisma.property.update({
            where: { id: invitation.propertyId },
            data: {
                managerId
            }
        });

        return { success: true };
    }

    // Manager declines invitation
    async declineInvitation(invitationId: string, managerEmail: string) {
        const invitation = await prisma.ownerManagerInvitation.findFirst({
            where: {
                id: invitationId,
                managerEmail,
                status: 'PENDING'
            }
        });

        if (!invitation) {
            throw new Error('Invitation not found or already processed');
        }

        await prisma.ownerManagerInvitation.update({
            where: { id: invitationId },
            data: {
                status: 'DECLINED',
                respondedAt: new Date()
            }
        });

        return { success: true };
    }
}
