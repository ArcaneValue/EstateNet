import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';

/**
 * Get recent activity for the authenticated user
 * Returns activities like:
 * - Properties created
 * - Managers assigned/unassigned
 * - Invitations sent/accepted/declined
 * - Payments received
 */
export const getRecentActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.user?.id;
    const userRole = req.user?.role;

    if (!id) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;

    // Build activity list based on user role
    const activities: any[] = [];

    if (userRole === 'OWNER') {
      // Get owner's properties
      const properties = await prisma.property.findMany({
        where: { ownerId: id },
        include: {
          manager: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              tenantIdentity: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Property creations
      properties.forEach((prop: any) => {
        activities.push({
          id: `prop-created-${prop.id}`,
          type: 'PROPERTY_CREATED',
          description: `Property "${prop.name}" was added`,
          timestamp: prop.createdAt,
          metadata: {
            propertyId: prop.id,
            propertyName: prop.name
          }
        });

        // Manager assignments
        if (prop.manager) {
          activities.push({
            id: `manager-assigned-${prop.id}`,
            type: 'MANAGER_ASSIGNED',
            description: `${prop.manager.name} was assigned to manage ${prop.name}`,
            timestamp: prop.updatedAt,
            metadata: {
              propertyId: prop.id,
              propertyName: prop.name,
              managerId: prop.manager.id,
              managerName: prop.manager.name
            }
          });
        }

        // Recent payments
        prop.payments.forEach((payment: any) => {
          activities.push({
            id: `payment-${payment.id}`,
            type: 'PAYMENT_RECEIVED',
            description: `Rent payment of UGX ${payment.amount} received from ${payment.tenantIdentity?.name || 'tenant'}`,
            timestamp: payment.createdAt,
            metadata: {
              paymentId: payment.id,
              amount: payment.amount,
              tenantId: payment.tenantId,
              tenantName: payment.tenantIdentity?.name,
              propertyId: prop.id,
              propertyName: prop.name
            }
          });
        });
      });

      // Get invitations
      const invitations = await prisma.ownerManagerInvitation.findMany({
        where: { ownerId: id },
        include: { property: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      invitations.forEach((inv: any) => {
        activities.push({
          id: `invitation-${inv.id}`,
          type: `INVITATION_${inv.status}`,
          description: inv.status === 'PENDING'
            ? `Invitation sent to ${inv.managerEmail} for ${inv.property?.name}`
            : inv.status === 'ACCEPTED'
              ? `${inv.managerEmail} accepted invitation for ${inv.property?.name}`
              : `${inv.managerEmail} declined invitation for ${inv.property?.name}`,
          timestamp: inv.createdAt,
          metadata: {
            invitationId: inv.id,
            managerEmail: inv.managerEmail,
            propertyId: inv.propertyId,
            propertyName: inv.property?.name,
            status: inv.status
          }
        });
      });
    }

    if (userRole === 'MANAGER') {
      // Get properties managed by this manager
      const properties = await prisma.property.findMany({
        where: { managerId: id },
        include: {
          owner: true,
          leases: {
            include: {
              tenantIdentity: true
            }
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              tenantIdentity: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Property assignments (when manager was assigned)
      properties.forEach((prop: any) => {
        activities.push({
          id: `prop-assigned-${prop.id}`,
          type: 'PROPERTY_ASSIGNED',
          description: `You were assigned to manage "${prop.name}"`,
          timestamp: prop.updatedAt,
          metadata: {
            propertyId: prop.id,
            propertyName: prop.name,
            ownerId: prop.ownerId,
            ownerName: prop.owner.name
          }
        });

        // Recent payments
        prop.payments.forEach((payment: any) => {
          activities.push({
            id: `payment-${payment.id}`,
            type: 'PAYMENT_RECEIVED',
            description: `Rent payment of UGX ${payment.amount} received from ${payment.tenantIdentity?.name || 'tenant'} for ${prop.name}`,
            timestamp: payment.createdAt,
            metadata: {
              paymentId: payment.id,
              amount: payment.amount,
              tenantId: payment.tenantId,
              tenantName: payment.tenantIdentity?.name,
              propertyId: prop.id,
              propertyName: prop.name
            }
          });
        });
      });

      // Get invitations accepted/declined for this manager
      const invitations = await prisma.ownerManagerInvitation.findMany({
        where: {
          managerId: id,
          status: { in: ['ACCEPTED', 'DECLINED'] }
        },
        include: { property: true, owner: true },
        orderBy: { respondedAt: 'desc' },
        take: 10
      });

      invitations.forEach((inv: any) => {
        activities.push({
          id: `invitation-${inv.id}`,
          type: `INVITATION_${inv.status}`,
          description: inv.status === 'ACCEPTED'
            ? `You accepted invitation to manage ${inv.property?.name}`
            : `You declined invitation to manage ${inv.property?.name}`,
          timestamp: inv.respondedAt || inv.createdAt,
          metadata: {
            invitationId: inv.id,
            propertyId: inv.propertyId,
            propertyName: inv.property?.name,
            ownerId: inv.ownerId,
            ownerName: inv.owner?.name,
            status: inv.status
          }
        });
      });
    }

    // Sort by timestamp descending and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: sortedActivities
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity'
    });
  }
};
