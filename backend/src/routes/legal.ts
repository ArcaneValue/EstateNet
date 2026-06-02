import { Router } from 'express';
import { getLegalStatus, acceptLegalDocument, notifyLegalUpdate } from '../controllers/legalController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// GET /legal/status - Get current legal document versions and user's acceptance status
router.get('/status', authenticateToken, getLegalStatus);

// POST /legal/accept - Accept a legal document version
router.post('/accept', authenticateToken, acceptLegalDocument);

// POST /legal/notify-update - Admin: email all users about a legal update
router.post('/notify-update', authenticateToken, notifyLegalUpdate);

export { router as legalRoutes };
