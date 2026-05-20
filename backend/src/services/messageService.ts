import { prisma } from '../utils/database';

// Temporary type until Prisma client types are regenerated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Message = any;

export type MessageBox = 'inbox' | 'sent';

export interface CreateMessageData {
  fromUserId: string;
  toUserId: string;
  leaseId?: string | null;
  subject?: string | null;
  body: string;
}

export class MessageService {
  async getMessagesForUser(userId: string, box: MessageBox, leaseId?: string): Promise<Message[]> {
    const where: any = {};

    if (box === 'inbox') {
      where.toUserId = userId;
    } else {
      where.fromUserId = userId;
    }

    if (leaseId) {
      where.leaseId = leaseId;
    }

    return await (prisma as any).message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tenantId: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tenantId: true,
          },
        },
        lease: {
          select: {
            id: true,
            propertyId: true,
            unitId: true,
            property: {
              select: {
                id: true,
                name: true,
              },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async createMessage(data: CreateMessageData): Promise<Message> {
    return await (prisma as any).message.create({
      data: {
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        leaseId: data.leaseId ?? null,
        subject: data.subject ?? null,
        body: data.body,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tenantId: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tenantId: true,
          },
        },
        lease: {
          select: {
            id: true,
            propertyId: true,
            unitId: true,
            property: {
              select: {
                id: true,
                name: true,
              },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async markAsRead(messageId: string, userId: string): Promise<Message> {
    const existing = await (prisma as any).message.findUnique({
      where: { id: messageId },
    });

    if (!existing) {
      throw new Error('Message not found');
    }

    if (existing.toUserId !== userId) {
      throw new Error('Not authorized to mark this message as read');
    }

    if (existing.readAt) {
      return existing;
    }

    return await (prisma as any).message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }
}
