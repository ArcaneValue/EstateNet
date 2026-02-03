import { Router } from 'express';
import {
    createManagerInvitation,
    getOwnerInvitations,
    cancelInvitation,
    getManagerInvitations,
    acceptInvitation,
    declineInvitation
} from '../controllers/ownerInvitationController';
import { authenticateToken } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

// Owner-only endpoints
router.post('/invitations',
    authenticateToken,
    requireRole('OWNER'),
    createManagerInvitation
);

router.get('/invitations',
    authenticateToken,
    requireRole('OWNER'),
    getOwnerInvitations
);

router.delete('/invitations/:id',
    authenticateToken,
    requireRole('OWNER'),
    cancelInvitation
);

// Manager endpoints
router.get('/invitations/manager',
    authenticateToken,
    requireRole('MANAGER'),
    getManagerInvitations
);

router.post('/invitations/manager/:id/accept',
    authenticateToken,
    requireRole('MANAGER'),
    acceptInvitation
);

router.post('/invitations/manager/:id/decline',
    authenticateToken,
    requireRole('MANAGER'),
    declineInvitation
);

export { router as ownerInvitationRoutes };
