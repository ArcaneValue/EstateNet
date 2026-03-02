import { Router } from 'express';
import { getActiveLease, endLease, createLease } from '../controllers/leaseController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { requireRestrictedOperations, requireSuspendedOperations } from '../middlewares/billingEnforcement';
import { UserRole } from '../types/prisma';

const router = Router();

// GET /api/tenant/me/active-lease - Get tenant's active lease (Tenant only)
router.get('/me/active-lease',
  authenticateToken,
  requireUserRole(UserRole.TENANT),
  getActiveLease
);

// POST /api/leases - Create lease (Manager only)
router.post('/',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  requireRestrictedOperations,
  requireSuspendedOperations,
  createLease
);

// POST /api/leases/:leaseId/end - End lease (Manager only)
router.post('/:leaseId/end',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  endLease
);

export { router as leaseRoutes };
