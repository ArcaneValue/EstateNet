import { Router, Response } from 'express';
import { getCurrentUser, updateCurrentUser } from '../controllers/userController';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';

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

// GET /api/users/search - Search for users by name, email, or phone
router.get(
  '/search',
  authenticateToken,
  async (req, res) => {
    try {
      const { q, roles } = req.query;

      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Query must be at least 2 characters'
        });
      }

      const roleFilter = roles && typeof roles === 'string'
        ? roles.split(',')
        : ['OWNER', 'MANAGER'];

      const users = await (prisma.user as any).findMany({
        where: {
          role: { in: roleFilter as any },
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phoneNumber: { contains: q } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          billingTermsAcceptedAt: true
        },
        take: 10
      });

      return res.json({
        success: true,
        users
      });
    } catch (error) {
      console.error('User search error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to search users'
      });
    }
  }
);

// POST /api/users/accept-billing-terms - Accept billing terms and conditions
router.post(
  '/accept-billing-terms',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      await (prisma.user as any).update({
        where: { id: userId },
        data: { billingTermsAcceptedAt: new Date() }
      });

      return res.json({
        success: true,
        message: 'Billing terms accepted successfully'
      });
    } catch (error) {
      console.error('Accept billing terms error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to accept billing terms'
      });
    }
  }
);

// PATCH /api/users/me/tutorial-flags - Update tutorial completion flags
router.patch(
  '/me/tutorial-flags',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { tutorialKey, completed } = req.body;

      if (!tutorialKey || typeof tutorialKey !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Tutorial key is required'
        });
      }

      // Get current user's tutorial flags
      const user = await (prisma.user as any).findUnique({
        where: { id: userId },
        select: { tutorialFlags: true }
      });

      const currentFlags = user?.tutorialFlags || {};
      const updatedFlags = {
        ...currentFlags,
        [tutorialKey]: completed !== false // Default to true if not specified
      };

      await (prisma.user as any).update({
        where: { id: userId },
        data: { tutorialFlags: updatedFlags }
      });

      return res.json({
        success: true,
        message: 'Tutorial flag updated successfully',
        data: { tutorialFlags: updatedFlags }
      });
    } catch (error) {
      console.error('Update tutorial flags error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update tutorial flags'
      });
    }
  }
);

export { router as userRoutes };
