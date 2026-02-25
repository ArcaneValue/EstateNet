/// <reference types="jest" />
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
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  servicePayment: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Make $transaction execute the callback with mockPrisma as the tx client
mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));

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
  timeoutStalePendingPayments,
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
    amount: 31920, // feeAmount only (service charge)
  };

  test('marks payment SUCCESS and invoice PAID on successful webhook', async () => {
    mockPrisma.servicePayment.findUnique.mockResolvedValue(pendingPayment);
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-001', managerId: 'mgr-001', status: 'DUE', subtotalAmount: 800000, feeAmount: 31920,
    });
    mockPrisma.servicePayment.update.mockResolvedValue({ ...pendingPayment, status: 'SUCCESS' });
    mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-001', status: 'PAID' });
    mockPrisma.invoice.count.mockResolvedValue(0); // no remaining overdue
    mockPrisma.user.update.mockResolvedValue({});

    const result = await processWebhook({
      body: { externalRef: 'SPAY-ABC123', status: 'SUCCESS', providerTxId: 'TX-001' },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('SUCCESS');

    // Transaction should have been used
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

    // Invoice should be marked PAID with paidAt timestamp
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-001' },
        data: expect.objectContaining({ status: 'PAID' }),
      })
    );
    const invoiceUpdateCall = mockPrisma.invoice.update.mock.calls[0][0];
    expect(invoiceUpdateCall.data.paidAt).toBeInstanceOf(Date);

    // Manager should be unlocked (no remaining overdue)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'mgr-001' },
      data: { billingStatus: 'CURRENT', billingGraceUntil: null },
    });
  });

  test('does NOT unlock manager if other OVERDUE invoices remain', async () => {
    mockPrisma.servicePayment.findUnique.mockResolvedValue(pendingPayment);
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-001', managerId: 'mgr-001', status: 'DUE', subtotalAmount: 800000, feeAmount: 31920,
    });
    mockPrisma.servicePayment.update.mockResolvedValue({ ...pendingPayment, status: 'SUCCESS' });
    mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-001', status: 'PAID' });
    mockPrisma.invoice.count.mockResolvedValue(2); // 2 other overdue invoices
    mockPrisma.user.update.mockResolvedValue({});

    const result = await processWebhook({
      body: { externalRef: 'SPAY-ABC123', status: 'SUCCESS', providerTxId: 'TX-001' },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('SUCCESS');

    // Invoice still marked PAID with paidAt
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-001' },
        data: expect.objectContaining({ status: 'PAID' }),
      })
    );
    const invoiceUpdateCall = mockPrisma.invoice.update.mock.calls[0][0];
    expect(invoiceUpdateCall.data.paidAt).toBeInstanceOf(Date);

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
      amount: 31920, // feeAmount only (service charge)
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

// ─── Amount mismatch prevents invoice paid ──────────────────────────────────

describe('processWebhook — amount mismatch', () => {
  test('marks payment FAILED with AMOUNT_MISMATCH when amounts differ', async () => {
    const payment = {
      id: 'pay-mismatch',
      invoiceId: 'inv-001',
      managerId: 'mgr-001',
      externalRef: 'SPAY-MISMATCH',
      status: 'PENDING',
      amount: 99999, // wrong amount
    };

    mockPrisma.servicePayment.findUnique.mockResolvedValue(payment);
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-001',
      managerId: 'mgr-001',
      status: 'DUE',
      subtotalAmount: 50000,
      feeAmount: 1995,
    });
    mockPrisma.servicePayment.update.mockResolvedValue({ ...payment, status: 'FAILED' });

    const result = await processWebhook({
      body: { externalRef: 'SPAY-MISMATCH', status: 'SUCCESS', providerTxId: 'TX-002' },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('FAILED');
    expect(result.message).toBe('Amount mismatch');

    // Payment should be marked FAILED with AMOUNT_MISMATCH reason
    expect(mockPrisma.servicePayment.update).toHaveBeenCalledWith({
      where: { id: 'pay-mismatch' },
      data: { status: 'FAILED', failureReason: 'AMOUNT_MISMATCH' },
    });

    // Invoice should NOT be marked PAID
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  test('marks payment FAILED with INVOICE_ALREADY_PAID on double-pay', async () => {
    const payment = {
      id: 'pay-double',
      invoiceId: 'inv-001',
      managerId: 'mgr-001',
      externalRef: 'SPAY-DOUBLE',
      status: 'PENDING',
      amount: 31920, // feeAmount only (service charge)
    };

    mockPrisma.servicePayment.findUnique.mockResolvedValue(payment);
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-001',
      managerId: 'mgr-001',
      status: 'PAID', // already paid
      subtotalAmount: 800000,
      feeAmount: 31920,
    });
    mockPrisma.servicePayment.update.mockResolvedValue({ ...payment, status: 'FAILED' });

    const result = await processWebhook({
      body: { externalRef: 'SPAY-DOUBLE', status: 'SUCCESS', providerTxId: 'TX-003' },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('FAILED');
    expect(result.message).toBe('Invoice already paid');

    expect(mockPrisma.servicePayment.update).toHaveBeenCalledWith({
      where: { id: 'pay-double' },
      data: { status: 'FAILED', failureReason: 'INVOICE_ALREADY_PAID' },
    });

    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });
});

// ─── Timeout cleanup job ────────────────────────────────────────────────────

describe('timeoutStalePendingPayments', () => {
  test('marks stale PENDING payments as FAILED with TIMEOUT', async () => {
    mockPrisma.servicePayment.updateMany.mockResolvedValue({ count: 3 });

    const count = await timeoutStalePendingPayments();

    expect(count).toBe(3);
    expect(mockPrisma.servicePayment.updateMany).toHaveBeenCalledTimes(1);

    const call = mockPrisma.servicePayment.updateMany.mock.calls[0][0];
    expect(call.where.status).toBe('PENDING');
    expect(call.where.createdAt.lt).toBeInstanceOf(Date);
    expect(call.data.status).toBe('FAILED');
    expect(call.data.failureReason).toBe('TIMEOUT');
  });

  test('returns 0 when no stale payments exist', async () => {
    mockPrisma.servicePayment.updateMany.mockResolvedValue({ count: 0 });

    const count = await timeoutStalePendingPayments();
    expect(count).toBe(0);
  });
});

// ─── Webhook secret enforcement ─────────────────────────────────────────────

describe('requireWebhookAuth middleware', () => {
  // We test the middleware directly
  let requireWebhookAuth: any;

  beforeAll(() => {
    // Dynamic import to avoid module-level side effects
    requireWebhookAuth = require('../src/middlewares/requireWebhookAuth').requireWebhookAuth;
  });

  const mockReq = (headers: Record<string, string> = {}) => ({
    headers,
  });

  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = jest.fn();

  afterEach(() => {
    mockNext.mockClear();
    delete process.env.PAYMENT_PROVIDER;
    delete process.env.PAYMENTS_WEBHOOK_SECRET;
  });

  test('allows all requests when PAYMENT_PROVIDER=MOCK', () => {
    process.env.PAYMENT_PROVIDER = 'MOCK';
    const req = mockReq();
    const res = mockRes();

    requireWebhookAuth(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects when provider is not MOCK and no secret header', () => {
    process.env.PAYMENT_PROVIDER = 'YO';
    process.env.PAYMENTS_WEBHOOK_SECRET = 'my-secret-123';
    const req = mockReq({});
    const res = mockRes();

    requireWebhookAuth(req, res, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects when secret header does not match', () => {
    process.env.PAYMENT_PROVIDER = 'YO';
    process.env.PAYMENTS_WEBHOOK_SECRET = 'my-secret-123';
    const req = mockReq({ 'x-webhook-secret': 'wrong-secret' });
    const res = mockRes();

    requireWebhookAuth(req, res, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('allows when secret header matches', () => {
    process.env.PAYMENT_PROVIDER = 'YO';
    process.env.PAYMENTS_WEBHOOK_SECRET = 'my-secret-123';
    const req = mockReq({ 'x-webhook-secret': 'my-secret-123' });
    const res = mockRes();

    requireWebhookAuth(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 500 when secret not configured for non-MOCK provider', () => {
    process.env.PAYMENT_PROVIDER = 'YO';
    // No PAYMENTS_WEBHOOK_SECRET set
    const req = mockReq({ 'x-webhook-secret': 'anything' });
    const res = mockRes();

    requireWebhookAuth(req, res, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
