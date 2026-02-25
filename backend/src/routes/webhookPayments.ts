import { Router } from 'express';
import { handleMockWebhook } from '../controllers/servicePaymentController';
import { requireWebhookAuth } from '../middlewares/requireWebhookAuth';

/**
 * Webhook routes for payment providers.
 * Mounted at /api/payments/webhook — protected by requireWebhookAuth.
 * Each provider gets its own sub-path (e.g. /mock, /yo).
 * In MOCK mode the auth middleware is a pass-through.
 */
const router = Router();

// Apply webhook auth to all webhook routes
router.use(requireWebhookAuth);

// POST /api/payments/webhook/mock — Mock provider webhook (dev/E2E)
router.post('/mock', handleMockWebhook);

export { router as webhookPaymentRoutes };
