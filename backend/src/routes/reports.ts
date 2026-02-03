import { Router } from 'express';
import { getSamplePdf, getFinancialStatements } from '../controllers/reportController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';

const router = Router();

// GET /api/reports/sample-pdf - Generate sample PDF report
router.get('/sample-pdf',
  authenticateToken,
  getSamplePdf
);

// GET /api/reports/financial-statements - Get financial statements (Manager and Owner)
router.get('/financial-statements',
  authenticateToken,
  requireUserRole(UserRole.MANAGER, UserRole.OWNER),
  getFinancialStatements
);

export { router as reportRoutes };
