import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';
import { listOwnerPaymentsHandler, getOwnerPaymentHandler } from '../controllers/servicePaymentController';

const router = Router();

// GET /api/owner/billing/service-payments - List all service payments (OWNER)
router.get('/billing/service-payments',
  authenticateToken,
  requireUserRole(UserRole.OWNER),
  listOwnerPaymentsHandler
);

// GET /api/owner/billing/service-payments/:id - Get single service payment detail (OWNER)
router.get('/billing/service-payments/:id',
  authenticateToken,
  requireUserRole(UserRole.OWNER),
  getOwnerPaymentHandler
);

export { router as ownerBillingRoutes };
