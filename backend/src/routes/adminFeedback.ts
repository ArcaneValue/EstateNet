import express from 'express';
import { authenticateToken } from '../middlewares/auth';
import { requireAdmin, requireSuperAdmin, requirePermission } from '../middlewares/requireAdmin';
import adminFeedbackController from '../controllers/adminFeedbackController';
import { AdminAuthController } from '../controllers/adminAuthController';

const adminAuthController = new AdminAuthController();

const router = express.Router();

router.get('/posts', authenticateToken, requireAdmin, adminFeedbackController.getPosts.bind(adminFeedbackController));
router.put('/posts/:id/status', authenticateToken, requirePermission('canManagePosts'), adminFeedbackController.updatePostStatus.bind(adminFeedbackController));
router.post('/posts/:id/respond', authenticateToken, requirePermission('canManagePosts'), adminFeedbackController.respondToPost.bind(adminFeedbackController));
router.get('/analytics', authenticateToken, requirePermission('canViewAnalytics'), adminFeedbackController.getAnalytics.bind(adminFeedbackController));

router.get('/permissions', authenticateToken, requireSuperAdmin, adminFeedbackController.listAdmins.bind(adminFeedbackController));
router.post('/permissions', authenticateToken, requireSuperAdmin, adminFeedbackController.createAdmin.bind(adminFeedbackController));
router.put('/permissions/:email', authenticateToken, requireSuperAdmin, adminFeedbackController.updateAdmin.bind(adminFeedbackController));
router.delete('/permissions/:email', authenticateToken, requireSuperAdmin, adminFeedbackController.deleteAdmin.bind(adminFeedbackController));

// Create new admin account
router.post('/create-admin', authenticateToken, requireSuperAdmin, adminAuthController.createAdmin.bind(adminAuthController));

export default router;
