import { Router } from 'express';
import { getManagerTerms, acceptManagerTerms } from '../controllers/managerTermsController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';

const router = Router();

// GET /api/manager/terms - Get manager terms and acceptance status
router.get('/terms',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getManagerTerms
);

// POST /api/manager/terms/accept - Accept manager terms and conditions
router.post('/terms/accept',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  acceptManagerTerms
);

export { router as managerTermsRoutes };
