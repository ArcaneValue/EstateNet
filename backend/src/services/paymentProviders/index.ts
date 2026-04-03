import { PaymentProvider } from './types';
import mockProvider from './mockProvider';
import xyleProvider from './xyleProvider';

/**
 * Factory: returns the configured payment provider.
 * Reads PAYMENT_PROVIDER env var. Defaults to 'MOCK' for development.
 * Supported providers: MOCK (dev/testing), XYLE (production).
 */
export function getPaymentProvider(): PaymentProvider {
  const providerName = (process.env.PAYMENT_PROVIDER || 'MOCK').toUpperCase();

  switch (providerName) {
    case 'MOCK':
      return mockProvider;
    case 'XYLE':
      return xyleProvider;
    default:
      throw new Error(`Unknown payment provider: ${providerName}. Supported: MOCK, XYLE`);
  }
}
