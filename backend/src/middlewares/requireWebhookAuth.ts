import { Request, Response, NextFunction } from 'express';

/**
 * Webhook authentication middleware.
 * - If PAYMENT_PROVIDER=MOCK, allow all requests (dev/E2E).
 * - Otherwise, require header `x-webhook-secret` to match env `PAYMENTS_WEBHOOK_SECRET`.
 */
export const requireWebhookAuth = (req: Request, res: Response, next: NextFunction): void => {
  const provider = (process.env.PAYMENT_PROVIDER || 'MOCK').toUpperCase();

  // Allow all in MOCK mode (dev / E2E)
  if (provider === 'MOCK') {
    next();
    return;
  }

  const expectedSecret = process.env.PAYMENTS_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error('[WebhookAuth] PAYMENTS_WEBHOOK_SECRET not configured');
    res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    return;
  }

  const providedSecret = req.headers['x-webhook-secret'] as string | undefined;
  if (!providedSecret || providedSecret !== expectedSecret) {
    console.warn('[WebhookAuth] Invalid or missing webhook secret');
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  next();
};
