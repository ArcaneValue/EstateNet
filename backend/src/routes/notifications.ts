import { Router } from 'express';
import { getNotifications, markNotificationRead } from '../controllers/notificationController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// GET /api/notifications - Get notifications for current user
router.get(
  '/',
  authenticateToken,
  requireRole(['TENANT', 'MANAGER']),
  getNotifications
);

// POST /api/notifications/:id/read - Mark notification as read
router.post(
  '/:id/read',
  authenticateToken,
  requireRole(['TENANT', 'MANAGER']),
  markNotificationRead
);

export { router as notificationRoutes };
