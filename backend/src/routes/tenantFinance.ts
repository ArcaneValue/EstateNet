import { Router } from 'express';
import { getTenantRentStatusHandler } from '../controllers/tenantFinanceController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';

const router = Router();

// GET /api/tenant/rent-status - Get tenant's rent status for a period
router.get('/rent-status',
    authenticateToken,
    requireUserRole(UserRole.TENANT),
    getTenantRentStatusHandler
);

export { router as tenantFinanceRoutes };
