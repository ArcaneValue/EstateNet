/**
 * Payment provider adapter interface for manager service-charge payments.
 * Supports push-prompt mobile money flows (MTN, Airtel) via aggregators.
 */

export interface PushPaymentRequest {
  phoneNumber: string;
  amount: number;
  currency: string;
  network: string;       // 'MTN' | 'AIRTEL'
  externalRef: string;   // Our unique reference for this payment attempt
}

export interface PushPaymentResponse {
  providerRequestId: string;
  rawResponse?: Record<string, any>;
}

export interface WebhookPayload {
  body: Record<string, any>;
}

export interface WebhookResult {
  externalRef: string;
  providerTxId: string;
  success: boolean;
  failureReason?: string;
}

export interface PaymentProvider {
  readonly name: string;

  /**
   * Initiate a push payment prompt to the user's phone.
   * Returns a provider-side request ID for tracking.
   */
  initiatePush(req: PushPaymentRequest): Promise<PushPaymentResponse>;

  /**
   * Parse an incoming webhook payload from the provider.
   * Returns a normalized result with externalRef, success/fail, and providerTxId.
   */
  parseWebhook(payload: WebhookPayload): WebhookResult;
}
