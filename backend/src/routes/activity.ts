import { Router } from 'express';
import { getRecentActivity } from '../controllers/activityController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// GET /api/activity/recent - Get recent activity for the authenticated user
router.get('/recent',
  authenticateToken,
  getRecentActivity
);

export { router as activityRoutes };
