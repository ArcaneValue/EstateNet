import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { requireRole } from '../middlewares/auth';
import { RateLimitService } from '../services/rateLimitService';
import {
  createPaymentClaim,
  getTenantPaymentClaims,
  getManagerPaymentClaims,
  verifyPaymentClaim,
  getPaymentClaimHistory
} from '../controllers/paymentClaimController';

const router = Router();

// ─── Tenant Routes ──────────────────────────────────────────────────────

// Create a new payment claim
router.post(
  '/tenant/payment-claims',
  authenticateToken,
  requireRole(['TENANT']),
  RateLimitService.rateLimitMiddleware(),
  createPaymentClaim
);

// Get tenant's payment claims
router.get(
  '/tenant/payment-claims',
  authenticateToken,
  requireRole(['TENANT']),
  getTenantPaymentClaims
);

// ─── Manager Routes ─────────────────────────────────────────────────────

// Get payment claims for manager to review
router.get(
  '/manager/payment-claims',
  authenticateToken,
  requireRole(['MANAGER']),
  getManagerPaymentClaims
);

// Verify or reject a payment claim
router.post(
  '/manager/payment-claims/:claimId/verify',
  authenticateToken,
  requireRole(['MANAGER']),
  verifyPaymentClaim
);

// Get payment claim audit history
router.get(
  '/manager/payment-claims/:claimId/history',
  authenticateToken,
  requireRole(['MANAGER']),
  getPaymentClaimHistory
);

export { router as paymentClaimRoutes };
export default router;
