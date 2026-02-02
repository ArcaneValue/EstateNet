import { Response } from 'express';
import { TenantService, CreateInvitationData } from '../services/tenantService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { LeaseStatus } from '../types/prisma';
import { prisma } from '../utils/database';
import { NotificationService } from '../services/notificationService';

const tenantService = new TenantService();
const notificationService = new NotificationService();

export const inviteTenant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, propertyId, unitId, rentAmount }: CreateInvitationData = req.body;

    // Validation
    if (!tenantId || !propertyId || !unitId || !rentAmount) {
      res.status(400).json({
        success: false,
        message: 'All fields are required: tenantId, propertyId, unitId, rentAmount'
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Manager ID required'
      });
      return;
    }

    const invitation = await tenantService.createInvitation({
      tenantId,
      propertyId,
      unitId,
      rentAmount,
      invitedByUserId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Tenant invited successfully',
      data: invitation
    });
  } catch (error) {
    console.error('Invite tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getTenantMessageTargets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID not found in user profile'
      });
      return;
    }

    const invitations = await (prisma as any).tenantInvitation.findMany({
      where: {
        tenantId: req.user.tenantId
      },
      include: {
        invitingUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    const targetsMap: Record<string, { userId: string; name: string; email: string; role: string }> = {};

    for (const inv of invitations) {
      if (inv.invitedByUserId && inv.invitingUser) {
        const user = inv.invitingUser as any;
        targetsMap[inv.invitedByUserId] = {
          userId: inv.invitedByUserId,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    }

    const targets = Object.values(targetsMap);

    res.status(200).json({
      success: true,
      data: targets
    });
  } catch (error) {
    console.error('Get tenant message targets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const acceptInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { invitationId } = req.params;

    if (!invitationId) {
      res.status(400).json({
        success: false,
        message: 'Invitation ID is required'
      });
      return;
    }

    // Get invitation to verify tenant ownership
    const invitation = await (prisma as any).tenantInvitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation) {
      res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
      return;
    }

    // Verify that the authenticated user owns this invitation
    if (invitation.tenantId !== req.user?.tenantId) {
      res.status(403).json({
        success: false,
        message: 'You can only accept your own invitations'
      });
      return;
    }

    const lease = await tenantService.acceptInvitation(invitationId);

    // Create notifications for tenant and inviting manager
    try {
      // Notify tenant (current user)
      if (req.user?.id) {
        await notificationService.createNotification({
          userId: req.user.id,
          type: 'INVITATION_ACCEPTED',
          title: 'Invitation accepted',
          body: 'You have accepted a tenancy invitation.',
          metadata: {
            invitationId,
            propertyId: invitation.propertyId,
            unitId: invitation.unitId,
            status: 'ACCEPTED'
          }
        });
      }

      // Notify inviting manager if available
      if (invitation.invitedByUserId) {
        await notificationService.createNotification({
          userId: invitation.invitedByUserId,
          type: 'INVITATION_ACCEPTED',
          title: 'Tenant accepted invitation',
          body: `A tenant has accepted your invitation for property ${invitation.propertyId}.`,
          metadata: {
            invitationId,
            tenantId: invitation.tenantId,
            propertyId: invitation.propertyId,
            unitId: invitation.unitId,
            status: 'ACCEPTED'
          }
        });
      }
    } catch (notifyError) {
      console.error('Invitation accept notification error:', notifyError);
    }

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      data: lease
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const declineInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { invitationId } = req.params;

    if (!invitationId) {
      res.status(400).json({
        success: false,
        message: 'Invitation ID is required'
      });
      return;
    }

    // Get invitation to verify tenant ownership
    const invitation = await (prisma as any).tenantInvitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation) {
      res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
      return;
    }

    // Verify that the authenticated user owns this invitation
    if (invitation.tenantId !== req.user?.tenantId) {
      res.status(403).json({
        success: false,
        message: 'You can only decline your own invitations'
      });
      return;
    }

    const updatedInvitation = await tenantService.declineInvitation(invitationId);

    // Create notifications for tenant and inviting manager
    try {
      if (req.user?.id) {
        await notificationService.createNotification({
          userId: req.user.id,
          type: 'INVITATION_DECLINED',
          title: 'Invitation declined',
          body: 'You have declined a tenancy invitation.',
          metadata: {
            invitationId,
            propertyId: invitation.propertyId,
            unitId: invitation.unitId,
            status: 'DECLINED'
          }
        });
      }

      if (invitation.invitedByUserId) {
        await notificationService.createNotification({
          userId: invitation.invitedByUserId,
          type: 'INVITATION_DECLINED',
          title: 'Tenant declined invitation',
          body: `A tenant has declined your invitation for property ${invitation.propertyId}.`,
          metadata: {
            invitationId,
            tenantId: invitation.tenantId,
            propertyId: invitation.propertyId,
            unitId: invitation.unitId,
            status: 'DECLINED'
          }
        });
      }
    } catch (notifyError) {
      console.error('Invitation decline notification error:', notifyError);
    }

    res.status(200).json({
      success: true,
      message: 'Invitation declined successfully',
      data: updatedInvitation
    });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const getTenantInvitations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID not found in user profile'
      });
      return;
    }

    const invitations = await tenantService.getInvitationsByTenant(req.user.tenantId);

    res.status(200).json({
      success: true,
      data: invitations
    });
  } catch (error) {
    console.error('Get tenant invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getActiveLease = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID not found in user profile'
      });
      return;
    }

    const lease = await tenantService.getActiveLeaseByTenant(req.user.tenantId);

    res.status(200).json({
      success: true,
      data: lease
    });
  } catch (error) {
    console.error('Get active lease error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const cancelInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { invitationId } = req.params;

    if (!invitationId) {
      res.status(400).json({
        success: false,
        message: 'Invitation ID is required'
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Manager authentication required'
      });
      return;
    }

    const updatedInvitation = await tenantService.cancelInvitation(invitationId, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully',
      data: updatedInvitation
    });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = message.includes('not found') ? 404 :
      message.includes('only cancel') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message
    });
  }
};

/*
Postman examples:

POST /api/tenants/invite
{
  "tenantId": "T12345",
  "propertyId": "property-id-here",
  "unitId": "unit-id-here",
  "rentAmount": 1200000
}

POST /api/tenants/invitations/invitation-id-here/accept
(no body needed)

POST /api/tenants/invitations/invitation-id-here/decline
(no body needed)

GET /api/tenant/me/active-lease
(no body needed)
*/
