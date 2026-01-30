import { Router } from 'express';
import { getTenantRentStatus } from '../controllers/rentController';
import { getActiveLease } from '../controllers/leaseController';
import { getTenantMessageTargets } from '../controllers/tenantController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';

const router = Router();

// GET /api/tenant/me/rent-status - Get current tenant rent status
router.get(
  '/me/rent-status',
  authenticateToken,
  requireUserRole(UserRole.TENANT),
  getTenantRentStatus,
);

// GET /api/tenant/me/message-targets - Get message targets (e.g. inviting managers) for current tenant
router.get(
  '/me/message-targets',
  authenticateToken,
  requireUserRole(UserRole.TENANT),
  getTenantMessageTargets,
);

// GET /api/tenant/me/active-lease - Alias for fetching tenant's active lease
// This mirrors /api/leases/me/active-lease but keeps the more intuitive /tenant prefix for clients.
router.get(
  '/me/active-lease',
  authenticateToken,
  requireUserRole(UserRole.TENANT),
  getActiveLease,
);

export { router as tenantMeRoutes };
