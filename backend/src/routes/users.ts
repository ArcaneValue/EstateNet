import { Router } from 'express';
import { getCurrentUser, updateCurrentUser } from '../controllers/userController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// GET /api/users/me - Get current user's profile
router.get(
  '/me',
  authenticateToken,
  requireRole(['OWNER', 'MANAGER', 'TENANT']),
  getCurrentUser
);

// PATCH /api/users/me - Update current user's profile and preferences
router.patch(
  '/me',
  authenticateToken,
  requireRole(['OWNER', 'MANAGER', 'TENANT']),
  updateCurrentUser
);

export { router as userRoutes };
