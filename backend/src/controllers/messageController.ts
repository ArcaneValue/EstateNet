import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { MessageService, MessageBox } from '../services/messageService';
import { NotificationService } from '../services/notificationService';
import { prisma } from '../utils/database';

const messageService = new MessageService();
const notificationService = new NotificationService();

export const getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const boxParam = (req.query.box as string) || 'inbox';
    const box = boxParam === 'sent' ? 'sent' : 'inbox';
    const leaseId = req.query.leaseId as string | undefined;

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const messages = await messageService.getMessagesForUser(req.user.id, box as MessageBox, leaseId);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const createMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { toUserId, leaseId, subject, body } = req.body as {
      toUserId?: string;
      leaseId?: string;
      subject?: string;
      body?: string;
    };

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!toUserId || typeof toUserId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'toUserId is required',
      });
      return;
    }

    if (!body || typeof body !== 'string' || !body.trim()) {
      res.status(400).json({
        success: false,
        message: 'Message body is required',
      });
      return;
    }

    const recipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true },
    });

    if (!recipient) {
      res.status(404).json({
        success: false,
        message: 'Recipient user not found',
      });
      return;
    }

    let validatedLeaseId: string | undefined;

    if (leaseId) {
      const lease = await (prisma as any).lease.findUnique({
        where: { id: leaseId },
      });

      if (!lease) {
        res.status(404).json({
          success: false,
          message: 'Lease not found',
        });
        return;
      }

      const isTenantOnLease = req.user.tenantId && lease.tenantId === req.user.tenantId;

      let isManagerForLease = false;
      if (!isTenantOnLease) {
        const invitation = await (prisma as any).tenantInvitation.findFirst({
          where: {
            tenantId: lease.tenantId,
            propertyId: lease.propertyId,
            unitId: lease.unitId,
            status: 'ACCEPTED',
            invitedByUserId: req.user.id,
          },
        });
        isManagerForLease = !!invitation;
      }

      if (!isTenantOnLease && !isManagerForLease) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to reference this lease in a message',
        });
        return;
      }

      validatedLeaseId = leaseId;
    }

    const message = await messageService.createMessage({
      fromUserId: req.user.id,
      toUserId,
      leaseId: validatedLeaseId,
      subject,
      body: body.trim(),
    });

    await notificationService.createNotification({
      userId: toUserId,
      type: 'MESSAGE',
      title: subject && subject.trim() ? subject : 'New message',
      body: body.length > 120 ? `${body.substring(0, 117)}...` : body,
      metadata: {
        messageId: message.id,
        fromUserId: req.user.id,
        leaseId: validatedLeaseId || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const markMessageRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Message ID is required',
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const updated = await messageService.markAsRead(id, req.user.id);

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
};
