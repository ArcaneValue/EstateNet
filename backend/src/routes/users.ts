import { Router } from 'express';
import { updateCurrentUser } from '../controllers/userController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// PATCH /api/users/me - Update current user's profile and preferences
router.patch(
  '/me',
  authenticateToken,
  requireRole(['TENANT', 'MANAGER']),
  updateCurrentUser
);

export { router as userRoutes };
