import { Router } from 'express';
import { handleMockWebhook } from '../controllers/servicePaymentController';

/**
 * Webhook routes for payment providers.
 * Mounted at /api/payments/webhook — NO authentication middleware.
 * Each provider gets its own sub-path (e.g. /mock, /yo).
 * Signature verification can be added per-provider as middleware here.
 */
const router = Router();

// POST /api/payments/webhook/mock — Mock provider webhook (dev/E2E)
router.post('/mock', handleMockWebhook);

export { router as webhookPaymentRoutes };
