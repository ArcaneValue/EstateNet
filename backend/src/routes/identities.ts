import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';
import { createTenantIdentity } from '../controllers/tenantIdentityController';
import { tenantIdentityValidation, validateRequest } from '../middlewares/validation';

const router = Router();

// Tenant: access own identity only
router.get(
    '/me',
    authenticateToken,
    requireRole(['TENANT']),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.tenantId) {
                res.status(400).json({ success: false, message: 'Tenant ID not found' });
                return;
            }

            const identity = await prisma.tenantIdentity.findUnique({
                where: { tenantId: req.user.tenantId }
            });

            if (!identity) {
                res.status(404).json({ success: false, message: 'Identity not found' });
                return;
            }

            res.status(200).json({ success: true, data: identity });
        } catch {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
);

// Tenant: create identity ONLY for self (prevents tenantId spoofing)
router.post(
    '/create',
    authenticateToken,
    requireRole(['TENANT']),
    tenantIdentityValidation,
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
        (req as any).body.tenantId = req.user?.tenantId;
        return createTenantIdentity(req as any, res);
    }
);

// Manager: lookup tenant by ID
router.get(
    '/:tenantId',
    authenticateToken,
    requireRole(['MANAGER']),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { tenantId } = req.params;

            if (!tenantId) {
                res.status(400).json({ success: false, message: 'Tenant ID required' });
                return;
            }

            const identity = await prisma.tenantIdentity.findUnique({
                where: { tenantId: tenantId },
                select: {
                    tenantId: true,
                    name: true,
                    email: true,
                    createdAt: true
                }
            });

            if (!identity) {
                res.status(404).json({ success: false, message: 'Tenant ID not found' });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    identity: identity
                }
            });
        } catch (error) {
            console.error('Tenant lookup error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
);

// Manager routes: protected but not implemented yet
router.get('/search/:query', authenticateToken, requireRole(['MANAGER']), (_req, res) => {
    res.status(403).json({ success: false, message: 'Not implemented' });
});

router.get('/', authenticateToken, requireRole(['MANAGER']), (_req, res) => {
    res.status(403).json({ success: false, message: 'Not implemented' });
});

export { router as identityRoutes };
