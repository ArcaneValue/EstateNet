import { Router } from 'express';
import { recordPayment, getPayments, getPaymentSummary } from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';

const router = Router();

// POST /api/payments - Record payment (Tenant only)
router.post('/',
  authenticateToken,
  requireUserRole(UserRole.TENANT),
  recordPayment
);

// GET /api/payments - Get payments (Tenant gets own, Manager can query by tenantId/propertyId)
router.get('/',
  authenticateToken,
  getPayments
);

// GET /api/payments/summary - Get payment summary (Manager only)
router.get('/summary',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getPaymentSummary
);

export { router as paymentRoutes };
