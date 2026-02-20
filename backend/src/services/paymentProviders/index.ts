import { PaymentProvider } from './types';
import mockProvider from './mockProvider';

/**
 * Factory: returns the configured payment provider.
 * Reads PAYMENT_PROVIDER env var. Defaults to 'MOCK' for development.
 * Add new providers here as they are integrated (e.g. 'YO').
 */
export function getPaymentProvider(): PaymentProvider {
  const providerName = (process.env.PAYMENT_PROVIDER || 'MOCK').toUpperCase();

  switch (providerName) {
    case 'MOCK':
      return mockProvider;
    default:
      throw new Error(`Unknown payment provider: ${providerName}. Supported: MOCK`);
  }
}
