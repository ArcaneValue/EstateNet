/**
 * Unit tests for the service payment subsystem.
 * Tests webhook idempotency and invoice-paid → manager-unlock flow.
 *
 * Mocks: prisma client (no real DB needed)
 */

// ─── Mock prisma before any imports ──────────────────────────────────────────

const mockPrisma = {
  invoice: {
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  servicePayment: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
};

jest.mock('../src/utils/database', () => ({
  prisma: mockPrisma,
}));

// Mock the payment provider factory to always return mock provider
jest.mock('../src/services/paymentProviders', () => ({
  getPaymentProvider: () => ({
    name: 'MOCK',
    initiatePush: jest.fn().mockResolvedValue({
      providerRequestId: 'MOCK-REQ-test123',
      rawResponse: { mock: true },
    }),
    parseWebhook: jest.fn().mockImplementation((payload: any) => {
      const { externalRef, status, providerTxId, failureReason } = payload.body;
      return {
        externalRef,
        providerTxId: providerTxId || 'MOCK-TX-test',
        success: status === 'SUCCESS',
        failureReason: status === 'FAILED' ? (failureReason || 'Payment failed') : undefined,
      };
    }),
  }),
}));

import {
  initiatePayment,
  processWebhook,
  getPaymentStatus,
  ServicePaymentError,
} from '../src/services/servicePaymentService';

// ─── Reset mocks between tests ──────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── initiatePayment ─────────────────────────────────────────────────────────

describe('initiatePayment', () => {
  const baseInvoice = {
    id: 'inv-001',
    managerId: 'mgr-001',
    status: 'DUE',
    subtotalAmount: 50000,
    feeAmount: 1995,
  };

  test('creates payment for a DUE invoice', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue(baseInvoice);
    mockPrisma.servicePayment.findFirst.mockResolvedValue(null); // no existing PENDING
    mockPrisma.servicePayment.create.mockImplementation(({ data }: any) => ({
      id: 'pay-001',
      ...data,
    }));

    const result = await initiatePayment({
      invoiceId: 'inv-001',
      managerId: 'mgr-001',
      phoneNumber: '0771234567',
      network: 'MTN',
    });

    expect(result.paymentId).toBe('pay-001');
    expect(result.status).toBe('PENDING');
    expect(result.providerRequestId).toBe('MOCK-REQ-test123');
    expect(mockPrisma.servicePayment.create).toHaveBeenCalledTimes(1);
  });

  test('returns existing PENDING payment instead of creating duplicate', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue(baseInvoice);
    mockPrisma.servicePayment.findFirst.mockResolvedValue({
      id: 'pay-existing',
      externalRef: 'SPAY-EXISTING',
      status: 'PENDING',
      providerRequestId: 'MOCK-REQ-old',
    });

    const result = await initiatePayment({
      invoiceId: 'inv-001',
      managerId: 'mgr-001',
      phoneNumber: '0771234567',
    });

    expect(result.paymentId).toBe('pay-existing');
    expect(result.status).toBe('PENDING');
    expect(mockPrisma.servicePayment.create).not.toHaveBeenCalled();
  });

  test('rejects already-paid invoice', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, status: 'PAID' });

    await expect(
      initiatePayment({ invoiceId: 'inv-001', managerId: 'mgr-001', phoneNumber: '0771234567' })
    ).rejects.toThrow(ServicePaymentError);

    await expect(
      initiatePayment({ invoiceId: 'inv-001', managerId: 'mgr-001', phoneNumber: '0771234567' })
    ).rejects.toThrow('already paid');
  });

  test('rejects invoice not belonging to manager', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue(null); // managerId filter won't match

    await expect(
      initiatePayment({ invoiceId: 'inv-001', managerId: 'mgr-999', phoneNumber: '0771234567' })
    ).rejects.toThrow(ServicePaymentError);
  });
});

// ─── processWebhook ──────────────────────────────────────────────────────────

describe('processWebhook', () => {
  const pendingPayment = {
    id: 'pay-001',
    invoiceId: 'inv-001',
    managerId: 'mgr-001',
    externalRef: 'SPAY-ABC123',
    status: 'PENDING',
  };

  test('marks payment SUCCESS and invoice PAID on successful webhook', async () => {
    mockPrisma.servicePayment.findUnique.mockResolvedValue(pendingPayment);
    mockPrisma.servicePayment.update.mockResolvedValue({ ...pendingPayment, status: 'SUCCESS' });
    mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-001', status: 'PAID' });
    mockPrisma.invoice.count.mockResolvedValue(0); // no remaining overdue
    mockPrisma.user.update.mockResolvedValue({});

    const result = await processWebhook({
      body: { externalRef: 'SPAY-ABC123', status: 'SUCCESS', providerTxId: 'TX-001' },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('SUCCESS');

    // Invoice should be marked PAID
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-001' },
      data: { status: 'PAID' },
    });

    // Manager should be unlocked (no remaining overdue)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'mgr-001' },
      data: { billingStatus: 'CURRENT', billingGraceUntil: null },
    });
  });

  test('does NOT unlock manager if other OVERDUE invoices remain', async () => {
    mockPrisma.servicePayment.findUnique.mockResolvedValue(pendingPayment);
    mockPrisma.servicePayment.update.mockResolvedValue({ ...pendingPayment, status: 'SUCCESS' });
    mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-001', status: 'PAID' });
    mockPrisma.invoice.count.mockResolvedValue(2); // 2 other overdue invoices
    mockPrisma.user.update.mockResolvedValue({});

    const result = await processWebhook({
      body: { externalRef: 'SPAY-ABC123', status: 'SUCCESS', providerTxId: 'TX-001' },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('SUCCESS');

    // Invoice still marked PAID
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-001' },
      data: { status: 'PAID' },
    });

    // Manager should NOT be unlocked
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  test('webhook idempotency: skips already-SUCCESS payment', async () => {
    mockPrisma.servicePayment.findUnique.mockResolvedValue({
      ...pendingPayment,
      status: 'SUCCESS',
    });

    const result = await processWebhook({
      body: { externalRef: 'SPAY-ABC123', status: 'SUCCESS', providerTxId: 'TX-001' },
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('Already processed');
    // No updates should happen
    expect(mockPrisma.servicePayment.update).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  test('webhook idempotency: skips already-FAILED payment', async () => {
    mockPrisma.servicePayment.findUnique.mockResolvedValue({
      ...pendingPayment,
      status: 'FAILED',
    });

    const result = await processWebhook({
      body: { externalRef: 'SPAY-ABC123', status: 'SUCCESS', providerTxId: 'TX-001' },
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('Already processed');
    expect(mockPrisma.servicePayment.update).not.toHaveBeenCalled();
  });

  test('handles FAILED webhook correctly', async () => {
    mockPrisma.servicePayment.findUnique.mockResolvedValue(pendingPayment);
    mockPrisma.servicePayment.update.mockResolvedValue({ ...pendingPayment, status: 'FAILED' });

    const result = await processWebhook({
      body: { externalRef: 'SPAY-ABC123', status: 'FAILED', failureReason: 'Insufficient funds' },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('FAILED');

    // Invoice should NOT be marked PAID
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  test('returns not-ok for unknown externalRef', async () => {
    mockPrisma.servicePayment.findUnique.mockResolvedValue(null);

    const result = await processWebhook({
      body: { externalRef: 'SPAY-UNKNOWN', status: 'SUCCESS', providerTxId: 'TX-001' },
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('not found');
  });
});

// ─── getPaymentStatus ────────────────────────────────────────────────────────

describe('getPaymentStatus', () => {
  test('returns payment scoped by managerId', async () => {
    const payment = {
      id: 'pay-001',
      invoiceId: 'inv-001',
      externalRef: 'SPAY-ABC',
      status: 'PENDING',
      amount: 51995,
      currency: 'UGX',
      provider: 'MOCK',
      network: 'MTN',
      phoneNumber: '0771234567',
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrisma.servicePayment.findFirst.mockResolvedValue(payment);

    const result = await getPaymentStatus('pay-001', 'mgr-001');

    expect(result).not.toBeNull();
    expect(result!.paymentId).toBe('pay-001');
    expect(result!.status).toBe('PENDING');
    expect(mockPrisma.servicePayment.findFirst).toHaveBeenCalledWith({
      where: { id: 'pay-001', managerId: 'mgr-001' },
    });
  });

  test('returns null for wrong managerId', async () => {
    mockPrisma.servicePayment.findFirst.mockResolvedValue(null);

    const result = await getPaymentStatus('pay-001', 'mgr-wrong');
    expect(result).toBeNull();
  });
});
