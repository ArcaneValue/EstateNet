import { Router } from 'express';
import { inviteTenant, acceptInvitation, declineInvitation, getTenantInvitations } from '../controllers/tenantController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';

const router = Router();

// POST /api/tenants/invite - Invite tenant (Manager only)
router.post('/invite',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  inviteTenant
);

// GET /api/tenants/invitations - Get tenant invitations (Tenant only)
router.get('/invitations',
  authenticateToken,
  requireUserRole(UserRole.TENANT),
  getTenantInvitations
);

// POST /api/tenants/invitations/:invitationId/accept - Accept invitation (Tenant only)
router.post('/invitations/:invitationId/accept',
  authenticateToken,
  requireUserRole(UserRole.TENANT),
  acceptInvitation
);

// POST /api/tenants/invitations/:invitationId/decline - Decline invitation (Tenant only)
router.post('/invitations/:invitationId/decline',
  authenticateToken,
  requireUserRole(UserRole.TENANT),
  declineInvitation
);

export { router as tenantRoutes };
