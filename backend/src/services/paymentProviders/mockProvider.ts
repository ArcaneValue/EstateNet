import { PaymentProvider, PushPaymentRequest, PushPaymentResponse, WebhookPayload, WebhookResult } from './types';

/**
 * Mock payment provider for development and E2E testing.
 * - initiatePush: returns a deterministic providerRequestId immediately (no real network call).
 * - parseWebhook: reads externalRef, status, providerTxId from the webhook body.
 *
 * To simulate a successful payment, POST to the mock webhook endpoint with:
 *   { "externalRef": "<ref>", "status": "SUCCESS", "providerTxId": "MOCK-TX-xxx" }
 *
 * To simulate a failure:
 *   { "externalRef": "<ref>", "status": "FAILED", "failureReason": "Insufficient funds" }
 */
const mockProvider: PaymentProvider = {
  name: 'MOCK',

  async initiatePush(req: PushPaymentRequest): Promise<PushPaymentResponse> {
    const providerRequestId = `MOCK-REQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[MockProvider] initiatePush called`, {
      phoneNumber: req.phoneNumber,
      amount: req.amount,
      currency: req.currency,
      network: req.network,
      externalRef: req.externalRef,
      providerRequestId,
    });

    return {
      providerRequestId,
      rawResponse: { mock: true, timestamp: new Date().toISOString() },
    };
  },

  parseWebhook(payload: WebhookPayload): WebhookResult {
    const { externalRef, status, providerTxId, failureReason } = payload.body;

    if (!externalRef || typeof externalRef !== 'string') {
      throw new Error('Mock webhook: missing or invalid externalRef');
    }
    if (!status || (status !== 'SUCCESS' && status !== 'FAILED')) {
      throw new Error('Mock webhook: status must be "SUCCESS" or "FAILED"');
    }

    const txId = providerTxId || `MOCK-TX-${Date.now()}`;

    console.log(`[MockProvider] parseWebhook`, { externalRef, status, providerTxId: txId });

    return {
      externalRef,
      providerTxId: txId,
      success: status === 'SUCCESS',
      failureReason: status === 'FAILED' ? (failureReason || 'Payment failed') : undefined,
    };
  },
};

export default mockProvider;
