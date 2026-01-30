import { prisma } from '../utils/database';

// Temporary type until Prisma client types are regenerated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Notification = any;

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  body: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

export class NotificationService {
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    return await (prisma as any).notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        metadata: data.metadata ?? null,
      },
    });
  }

  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    return await (prisma as any).notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const existing = await (prisma as any).notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing) {
      throw new Error('Notification not found');
    }

    if (existing.userId !== userId) {
      throw new Error('Not authorized to mark this notification as read');
    }

    if (existing.readAt) {
      return existing;
    }

    return await (prisma as any).notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }
}
