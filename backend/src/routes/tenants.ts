import { Router } from 'express';
import { inviteTenant, acceptInvitation, declineInvitation, getTenantInvitations, cancelInvitation } from '../controllers/tenantController';
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

// DELETE /api/tenants/invitations/:invitationId - Cancel invitation (Manager only)
router.delete('/invitations/:invitationId',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  cancelInvitation
);

export { router as tenantRoutes };
