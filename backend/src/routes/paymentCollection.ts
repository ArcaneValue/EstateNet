import { Router } from 'express';
import { initiatePayment, getPaymentById, simulatePaymentSuccess } from '../controllers/paymentCollectionController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';

const router = Router();

// POST /api/payments/initiate - Initiate payment (Tenant only)
router.post('/initiate',
  authenticateToken,
  requireUserRole(UserRole.TENANT),
  initiatePayment
);

// GET /api/payments/:id - Get payment by ID
router.get('/:id',
  authenticateToken,
  getPaymentById
);

// POST /api/payments/simulate-success/:paymentId - Simulate payment success (development only)
router.post('/simulate-success/:paymentId',
  authenticateToken,
  simulatePaymentSuccess
);

export { router as paymentCollectionRoutes };
