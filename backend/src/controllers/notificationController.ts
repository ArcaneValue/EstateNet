import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { NotificationService } from '../services/notificationService';

const notificationService = new NotificationService();

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const notifications = await notificationService.getNotificationsForUser(req.user.id);
    const unreadCount = await notificationService.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Notification ID is required',
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

    const updated = await notificationService.markAsRead(id, req.user.id);

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
};
