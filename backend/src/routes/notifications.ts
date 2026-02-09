import { Router } from 'express';
import { getNotifications, markNotificationRead } from '../controllers/notificationController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// GET /api/notifications - Get notifications for current user
router.get(
  '/',
  authenticateToken,
  requireRole(['OWNER', 'TENANT', 'MANAGER']),
  getNotifications
);

// POST /api/notifications/:id/read - Mark notification as read
router.post(
  '/:id/read',
  authenticateToken,
  requireRole(['OWNER', 'TENANT', 'MANAGER']),
  markNotificationRead
);

export { router as notificationRoutes };
