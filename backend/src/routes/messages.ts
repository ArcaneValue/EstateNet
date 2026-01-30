import { Router } from 'express';
import { getMessages, createMessage, markMessageRead } from '../controllers/messageController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// GET /api/messages?box=inbox|sent&leaseId? - Get messages for current user
router.get(
  '/',
  authenticateToken,
  requireRole(['TENANT', 'MANAGER']),
  getMessages
);

// POST /api/messages - Send a message
router.post(
  '/',
  authenticateToken,
  requireRole(['TENANT', 'MANAGER']),
  createMessage
);

// POST /api/messages/:id/read - Mark message as read
router.post(
  '/:id/read',
  authenticateToken,
  requireRole(['TENANT', 'MANAGER']),
  markMessageRead
);

export { router as messageRoutes };
