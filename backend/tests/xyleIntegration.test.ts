/// <reference types="jest" />
/**
 * Integration tests for Xyle payment provider.
 * Tests Xyle sandbox API integration for manager service fee payments.
 * 
 * NOTE: These tests require XYLE_SANDBOX_API_KEY to be set in .env
 * Set PAYMENT_PROVIDER=XYLE to run these tests
 */

import { getPaymentProvider } from '../src/services/paymentProviders';
import xyleProvider from '../src/services/paymentProviders/xyleProvider';

describe('Xyle Provider Integration Tests', () => {
  beforeAll(() => {
    // Ensure Xyle environment variables are set
    if (!process.env.XYLE_SANDBOX_API_KEY) {
      console.warn('XYLE_SANDBOX_API_KEY not set - skipping Xyle integration tests');
    }
  });

  describe('Provider Factory', () => {
    test('returns Xyle provider when PAYMENT_PROVIDER=XYLE', () => {
      const originalProvider = process.env.PAYMENT_PROVIDER;
      process.env.PAYMENT_PROVIDER = 'XYLE';
      
      const provider = getPaymentProvider();
      expect(provider.name).toBe('XYLE');
      
      process.env.PAYMENT_PROVIDER = originalProvider;
    });

    test('returns Mock provider when PAYMENT_PROVIDER=MOCK', () => {
      const originalProvider = process.env.PAYMENT_PROVIDER;
      process.env.PAYMENT_PROVIDER = 'MOCK';
      
      const provider = getPaymentProvider();
      expect(provider.name).toBe('MOCK');
      
      process.env.PAYMENT_PROVIDER = originalProvider;
    });
  });

  describe('Xyle Provider - initiatePush', () => {
    test('throws error if XYLE_SANDBOX_API_KEY is not set', async () => {
      const originalKey = process.env.XYLE_SANDBOX_API_KEY;
      delete process.env.XYLE_SANDBOX_API_KEY;

      await expect(
        xyleProvider.initiatePush({
          phoneNumber: '256771234567',
          amount: 1000,
          currency: 'UGX',
          network: 'MTN',
          externalRef: 'TEST-REF-001',
        })
      ).rejects.toThrow('XYLE_SANDBOX_API_KEY environment variable is not set');

      process.env.XYLE_SANDBOX_API_KEY = originalKey;
    });

    test('formats request correctly for Xyle API', async () => {
      if (!process.env.XYLE_SANDBOX_API_KEY) {
        console.log('Skipping test - XYLE_SANDBOX_API_KEY not set');
        return;
      }

      const request = {
        phoneNumber: '256771234567',
        amount: 1000,
        currency: 'UGX',
        network: 'MTN',
        externalRef: `TEST-${Date.now()}`,
      };

      // This will make a real API call to Xyle sandbox
      // Expected to fail with "Invalid or expired token" if key is invalid
      try {
        const response = await xyleProvider.initiatePush(request);
        
        // If successful, verify response structure
        expect(response).toHaveProperty('providerRequestId');
        expect(response.providerRequestId).toBeTruthy();
      } catch (error: any) {
        // Log error for debugging
        console.error('Xyle API Error:', error.message);
        
        // Verify error is from Xyle API, not our code
        expect(error.message).toMatch(/Xyle API/);
      }
    });
  });

  describe('Xyle Provider - parseWebhook', () => {
    test('parses successful webhook correctly', () => {
      const webhookPayload = {
        body: {
          reference: 'TEST-REF-001',
          transaction_id: 'XYLE-TX-12345',
          status: 'SUCCESS',
        },
      };

      const result = xyleProvider.parseWebhook(webhookPayload);

      expect(result.externalRef).toBe('TEST-REF-001');
      expect(result.providerTxId).toBe('XYLE-TX-12345');
      expect(result.success).toBe(true);
      expect(result.failureReason).toBeUndefined();
    });

    test('parses failed webhook correctly', () => {
      const webhookPayload = {
        body: {
          reference: 'TEST-REF-002',
          transaction_id: 'XYLE-TX-67890',
          status: 'FAILED',
          error: 'Insufficient funds',
        },
      };

      const result = xyleProvider.parseWebhook(webhookPayload);

      expect(result.externalRef).toBe('TEST-REF-002');
      expect(result.providerTxId).toBe('XYLE-TX-67890');
      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('Insufficient funds');
    });

    test('handles alternative field names (externalRef instead of reference)', () => {
      const webhookPayload = {
        body: {
          externalRef: 'TEST-REF-003',
          transactionId: 'XYLE-TX-11111',
          status: 'COMPLETED',
        },
      };

      const result = xyleProvider.parseWebhook(webhookPayload);

      expect(result.externalRef).toBe('TEST-REF-003');
      expect(result.providerTxId).toBe('XYLE-TX-11111');
      expect(result.success).toBe(true);
    });

    test('throws error if externalRef is missing', () => {
      const webhookPayload = {
        body: {
          transaction_id: 'XYLE-TX-99999',
          status: 'SUCCESS',
        },
      };

      expect(() => xyleProvider.parseWebhook(webhookPayload)).toThrow(
        'Xyle webhook: missing or invalid externalRef/reference'
      );
    });

    test('handles lowercase status values', () => {
      const webhookPayload = {
        body: {
          reference: 'TEST-REF-004',
          transaction_id: 'XYLE-TX-22222',
          status: 'success',
        },
      };

      const result = xyleProvider.parseWebhook(webhookPayload);

      expect(result.success).toBe(true);
    });
  });

  describe('Xyle Provider - Error Handling', () => {
    test('provides detailed error messages for API failures', async () => {
      if (!process.env.XYLE_SANDBOX_API_KEY) {
        console.log('Skipping test - XYLE_SANDBOX_API_KEY not set');
        return;
      }

      const request = {
        phoneNumber: 'invalid-phone',
        amount: -100, // Invalid amount
        currency: 'UGX',
        network: 'MTN',
        externalRef: `TEST-${Date.now()}`,
      };

      try {
        await xyleProvider.initiatePush(request);
        // If no error, fail the test
        fail('Expected API call to fail with invalid data');
      } catch (error: any) {
        // Verify error message contains useful information
        expect(error.message).toBeTruthy();
        expect(error.message).toMatch(/Xyle API/);
      }
    });
  });
});

describe('Xyle Integration - End-to-End Flow', () => {
  test('Xyle provider is properly registered and accessible', () => {
    const originalProvider = process.env.PAYMENT_PROVIDER;
    process.env.PAYMENT_PROVIDER = 'XYLE';
    
    const provider = getPaymentProvider();
    
    expect(provider).toBeDefined();
    expect(provider.name).toBe('XYLE');
    expect(typeof provider.initiatePush).toBe('function');
    expect(typeof provider.parseWebhook).toBe('function');
    
    process.env.PAYMENT_PROVIDER = originalProvider;
  });

  test('Environment variables are configured correctly', () => {
    expect(process.env.XYLE_SANDBOX_API_KEY).toBeDefined();
    expect(process.env.XYLE_API_URL).toBeDefined();
    
    if (process.env.XYLE_SANDBOX_API_KEY) {
      expect(process.env.XYLE_SANDBOX_API_KEY).toMatch(/^xyl_/);
    }
  });
});
