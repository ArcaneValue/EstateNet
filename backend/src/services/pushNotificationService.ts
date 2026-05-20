import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { prisma } from '../utils/database';

export class PushNotificationService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any,
    badge?: number
  ): Promise<void> {
    try {
      // Get user's push token
      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { pushToken: true },
      });

      if (!user?.pushToken) {
        console.log(`No push token found for user ${userId}`);
        return;
      }

      // Check if token is valid Expo push token
      if (!Expo.isExpoPushToken(user.pushToken)) {
        console.error(`Invalid Expo push token for user ${userId}: ${user.pushToken}`);
        return;
      }

      // Create the message
      const message: ExpoPushMessage = {
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
      };

      // Add badge count if provided
      if (badge !== undefined) {
        message.badge = badge;
      }

      // Send the notification
      const chunks = this.expo.chunkPushNotifications([message]);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      // Check for errors in tickets
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error(`Push notification error: ${ticket.message}`);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            // Token is invalid, remove it
            await (prisma as any).user.update({
              where: { id: userId },
              data: { pushToken: null },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in sendPushNotification:', error);
    }
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      const count = await (prisma as any).message.count({
        where: {
          toUserId: userId,
          readAt: null,
        },
      });
      return count;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }
}
