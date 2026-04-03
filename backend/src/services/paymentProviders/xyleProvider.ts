import { PaymentProvider, PushPaymentRequest, PushPaymentResponse, WebhookPayload, WebhookResult } from './types';
import axios from 'axios';

/**
 * Xyle payment provider for production mobile money payments.
 * Supports MTN and Airtel mobile money via Xyle API.
 * 
 * Environment variables required:
 * - XYLE_SANDBOX_API_KEY: Xyle sandbox API key
 * - XYLE_API_URL: Xyle API base URL (default: https://api.xylepayments.com/sandbox/api/v1)
 */
const xyleProvider: PaymentProvider = {
  name: 'XYLE',

  async initiatePush(req: PushPaymentRequest): Promise<PushPaymentResponse> {
    const apiKey = process.env.XYLE_SANDBOX_API_KEY;
    const baseUrl = process.env.XYLE_API_URL || 'https://api.xylepayments.com/sandbox/api/v1';

    if (!apiKey) {
      throw new Error('[XyleProvider] XYLE_SANDBOX_API_KEY environment variable is not set');
    }

    console.log(`[XyleProvider] Initiating push payment`, {
      phoneNumber: req.phoneNumber.substring(0, 6) + '***', // Mask phone number
      amount: req.amount,
      currency: req.currency,
      network: req.network,
      externalRef: req.externalRef,
    });

    try {
      // Map network to Xyle provider format
      const provider = req.network.toUpperCase() === 'MTN' ? 'MTN_UGANDA' : 'AIRTEL_UGANDA';

      const response = await axios.post(
        `${baseUrl}/deposit`,
        {
          account: req.phoneNumber,
          amount: req.amount,
          provider: provider,
        },
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log(`[XyleProvider] Push payment initiated successfully`, {
        externalRef: req.externalRef,
        providerRequestId: response.data.data?.id || response.data.data?.reference,
        status: response.data.data?.status,
      });

      return {
        providerRequestId: response.data.data?.id || response.data.data?.reference || `XYLE-${Date.now()}`,
        rawResponse: response.data,
      };
    } catch (error: any) {
      console.error(`[XyleProvider] Push payment failed`, {
        externalRef: req.externalRef,
        error: error.response?.data || error.message,
        status: error.response?.status,
        fullError: JSON.stringify(error, null, 2),
      });

      // Re-throw with more context
      if (error.response) {
        const errorMsg = `Xyle API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        console.error(`[XyleProvider] Full error message: ${errorMsg}`);
        throw new Error(errorMsg);
      } else if (error.request) {
        console.error(`[XyleProvider] No response received from Xyle API`);
        throw new Error(`Xyle API network error: No response received`);
      } else {
        console.error(`[XyleProvider] Error setting up request: ${error.message}`);
        throw new Error(`Xyle API error: ${error.message}`);
      }
    }
  },

  parseWebhook(payload: WebhookPayload): WebhookResult {
    console.log(`[XyleProvider] Parsing webhook payload`, {
      hasBody: !!payload.body,
      bodyKeys: Object.keys(payload.body || {}),
    });

    const { reference, id, status, transaction_ref } = payload.body;

    // Extract externalRef - Xyle uses 'reference' field
    const extractedRef = reference;
    if (!extractedRef || typeof extractedRef !== 'string') {
      console.error(`[XyleProvider] Webhook missing reference`, { payload: payload.body });
      throw new Error('Xyle webhook: missing or invalid reference field');
    }

    // Extract transaction ID - Xyle uses 'id' or 'transaction_ref'
    const txId = id || transaction_ref || `XYLE-TX-${Date.now()}`;

    // Determine success based on status
    // Xyle uses: COMPLETED, PENDING, FAILED
    const isSuccess = status === 'COMPLETED' || status === 'completed';
    const isFailed = status === 'FAILED' || status === 'failed';

    if (!isSuccess && !isFailed) {
      console.warn(`[XyleProvider] Webhook status not terminal: ${status}`, {
        externalRef: extractedRef,
      });
    }

    const result: WebhookResult = {
      externalRef: extractedRef,
      providerTxId: txId,
      success: isSuccess,
      failureReason: isFailed ? 'Payment failed' : undefined,
    };

    console.log(`[XyleProvider] Webhook parsed`, result);

    return result;
  },
};

export default xyleProvider;
