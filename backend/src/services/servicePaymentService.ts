import { prisma } from '../utils/database';
import { Prisma } from '@prisma/client';
import { getPaymentProvider } from './paymentProviders';
import { WebhookPayload } from './paymentProviders/types';

const PENDING_DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const PENDING_TIMEOUT_MS = 15 * 60 * 1000;      // 15 minutes

/**
 * Generates a unique external reference for a service payment attempt.
 */
function generateExternalRef(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `SPAY-${ts}-${rand}`.toUpperCase();
}

/**
 * Formats a Ugandan phone number to international format (256XXXXXXXXX).
 * Handles formats: 0771234567, 771234567, 256771234567, +256771234567
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 256, it's already in international format
  if (cleaned.startsWith('256')) {
    return cleaned;
  }

  // If starts with 0, remove it and add 256
  if (cleaned.startsWith('0')) {
    return '256' + cleaned.substring(1);
  }

  // If 9 digits (no leading 0), add 256
  if (cleaned.length === 9) {
    return '256' + cleaned;
  }

  // Return as-is if already correct length
  return cleaned;
}

// ─── Initiate Payment ────────────────────────────────────────────────────────

export interface InitiatePaymentParams {
  invoiceId: string;
  managerId: string;
  phoneNumber: string;
  network?: string; // 'MTN' | 'AIRTEL'; defaults to 'MTN'
}

export interface InitiatePaymentResult {
  paymentId: string;
  externalRef: string;
  status: string;
  providerRequestId: string | null;
}

export async function initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
  const { invoiceId, managerId, phoneNumber, network = 'MTN' } = params;

  // 1. Load invoice and verify ownership + payable status
  const invoice = await (prisma.invoice as any).findFirst({
    where: { id: invoiceId, billedUserId: managerId },
  });

  if (!invoice) {
    throw new ServicePaymentError('Invoice not found or does not belong to this manager', 404);
  }

  if (invoice.status === 'PAID') {
    throw new ServicePaymentError('Invoice is already paid', 400);
  }

  if (!['DUE', 'OVERDUE'].includes(invoice.status)) {
    throw new ServicePaymentError(`Invoice status "${invoice.status}" is not payable`, 400);
  }

  // 2. Check for existing PENDING payment within dedup window (5 min)
  const dedupCutoff = new Date(Date.now() - PENDING_DEDUP_WINDOW_MS);
  const existingPending = await prisma.servicePayment.findFirst({
    where: {
      invoiceId,
      status: 'PENDING',
      createdAt: { gt: dedupCutoff },
    },
  });

  if (existingPending) {
    // Return the existing pending payment instead of creating a duplicate
    return {
      paymentId: existingPending.id,
      externalRef: existingPending.externalRef,
      status: existingPending.status,
      providerRequestId: existingPending.providerRequestId,
    };
  }

  // 3. Calculate amount - EstateNet bills MANAGERS service fee only (Option A billing)
  // Invoices are immutable snapshots for the billing period
  const amount = invoice.feeAmount;

  // 4. Generate external ref and call provider
  const externalRef = generateExternalRef();
  const provider = getPaymentProvider();

  // Format phone number to international format (256XXXXXXXXX)
  const formattedPhone = formatPhoneNumber(phoneNumber);

  const pushResponse = await provider.initiatePush({
    phoneNumber: formattedPhone,
    amount,
    currency: 'UGX',
    network: network.toUpperCase(),
    externalRef,
  });

  // 5. Create ServicePayment record
  const payment = await prisma.servicePayment.create({
    data: {
      invoiceId,
      managerId,
      amount,
      currency: 'UGX',
      provider: provider.name,
      network: network.toUpperCase(),
      phoneNumber: formattedPhone,
      externalRef,
      providerRequestId: pushResponse.providerRequestId,
      status: 'PENDING',
    },
  });

  console.log(`[ServicePayment] Initiated payment ${payment.id} for invoice ${invoiceId}, ref=${externalRef}`);

  return {
    paymentId: payment.id,
    externalRef: payment.externalRef,
    status: payment.status,
    providerRequestId: payment.providerRequestId,
  };
}

// ─── Process Webhook ─────────────────────────────────────────────────────────

export interface ProcessWebhookResult {
  ok: boolean;
  paymentId?: string;
  status?: string;
  message?: string;
}

export async function processWebhook(payload: WebhookPayload): Promise<ProcessWebhookResult> {
  const provider = getPaymentProvider();

  // 1. Parse webhook (await for future async provider support)
  const result = await provider.parseWebhook(payload);

  // 2. Find payment by externalRef
  const payment = await prisma.servicePayment.findUnique({
    where: { externalRef: result.externalRef },
  });

  if (!payment) {
    console.warn(`[ServicePayment] Webhook: no payment found for externalRef=${result.externalRef}`);
    return { ok: false, message: 'Payment not found for externalRef' };
  }

  // 3. Idempotency: if already terminal, skip
  if (payment.status === 'SUCCESS' || payment.status === 'FAILED') {
    console.log(`[ServicePayment] Webhook: payment ${payment.id} already ${payment.status}, skipping`);
    return { ok: true, paymentId: payment.id, status: payment.status, message: 'Already processed' };
  }

  // 4. On SUCCESS: run correctness checks before marking paid
  if (result.success) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: payment.invoiceId },
    });

    if (!invoice) {
      await failPayment(payment.id, 'INVOICE_NOT_FOUND');
      return { ok: true, paymentId: payment.id, status: 'FAILED', message: 'Invoice not found' };
    }

    // Amount mismatch check - EstateNet bills service fee only
    const expectedAmount = invoice.feeAmount;
    if (payment.amount !== expectedAmount) {
      await failPayment(payment.id, 'AMOUNT_MISMATCH');
      console.warn(`[ServicePayment] AMOUNT_MISMATCH: payment ${payment.id} amount=${payment.amount}, expected=${expectedAmount}`);
      return { ok: true, paymentId: payment.id, status: 'FAILED', message: 'Amount mismatch' };
    }

    // Invoice already paid (double-pay guard)
    if (invoice.status === 'PAID') {
      await failPayment(payment.id, 'INVOICE_ALREADY_PAID');
      console.warn(`[ServicePayment] Invoice ${invoice.id} already PAID when webhook arrived`);
      return { ok: true, paymentId: payment.id, status: 'FAILED', message: 'Invoice already paid' };
    }

    // Invoice status must be DUE or OVERDUE
    if (!['DUE', 'OVERDUE'].includes(invoice.status)) {
      await failPayment(payment.id, 'INVOICE_NOT_PAYABLE');
      return { ok: true, paymentId: payment.id, status: 'FAILED', message: 'Invoice not payable' };
    }

    // Manager ID mismatch check
    const invoiceBilledUserId = (invoice as any).billedUserId || (invoice as any).managerId;
    if (invoiceBilledUserId !== payment.managerId) {
      await failPayment(payment.id, 'INVOICE_MANAGER_MISMATCH');
      return { ok: true, paymentId: payment.id, status: 'FAILED', message: 'Invoice manager mismatch' };
    }
  }

  // 5. SUCCESS: atomic transaction (payment + invoice + manager billing)
  if (result.success) {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // a) Mark payment SUCCESS
      await tx.servicePayment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          providerTxId: result.providerTxId,
          failureReason: null,
        },
      });

      // b) Mark invoice PAID with paidAt timestamp
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: 'PAID', paidAt: new Date() },
      });

      // c) Recompute manager billing status
      const remainingOverdue = await (tx.invoice as any).count({
        where: {
          billedUserId: payment.managerId,
          status: 'OVERDUE',
          id: { not: payment.invoiceId },
        },
      });

      if (remainingOverdue === 0) {
        await tx.user.update({
          where: { id: payment.managerId },
          data: {
            billingStatus: 'CURRENT',
            billingGraceUntil: null,
          },
        });
        console.log(`[ServicePayment] Manager ${payment.managerId} billing set to CURRENT (no remaining overdue)`);
      } else {
        console.log(`[ServicePayment] Manager ${payment.managerId} still has ${remainingOverdue} overdue invoice(s)`);
      }
    });

    console.log(`[ServicePayment] Webhook: payment ${payment.id} → SUCCESS (invoice ${payment.invoiceId} marked PAID)`);
    return { ok: true, paymentId: payment.id, status: 'SUCCESS' };
  }

  // 6. FAILED: update payment only (no transaction needed)
  await prisma.servicePayment.update({
    where: { id: payment.id },
    data: {
      status: 'FAILED',
      providerTxId: result.providerTxId,
      failureReason: result.failureReason || null,
    },
  });

  console.log(`[ServicePayment] Webhook: payment ${payment.id} → FAILED`);
  return { ok: true, paymentId: payment.id, status: 'FAILED' };
}

// ─── Get Payment Status (polling) ────────────────────────────────────────────

export interface PaymentStatusResult {
  paymentId: string;
  invoiceId: string;
  externalRef: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  network: string;
  phoneNumber: string;
  providerTxId: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getPaymentStatus(paymentId: string, managerId: string): Promise<PaymentStatusResult | null> {
  const payment = await (prisma.servicePayment as any).findFirst({
    where: { id: paymentId, managerId },
  });

  if (!payment) return null;

  return mapPaymentToResult(payment);
}

// ─── Manager: list service payments ──────────────────────────────────────────

export async function listManagerServicePayments(managerId: string, limit: number = 20): Promise<PaymentStatusResult[]> {
  const payments = await (prisma.servicePayment as any).findMany({
    where: { managerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return payments.map(mapPaymentToResult);
}

// ─── Manager: get single service payment ─────────────────────────────────────

export async function getManagerServicePayment(paymentId: string, managerId: string): Promise<PaymentStatusResult | null> {
  const payment = await (prisma.servicePayment as any).findFirst({
    where: { id: paymentId, managerId },
  });
  if (!payment) return null;
  return mapPaymentToResult(payment);
}

// ─── Owner: list all service payments ────────────────────────────────────────

export async function listOwnerServicePayments(filters: { status?: string; limit?: number }): Promise<any[]> {
  const where: any = {};
  if (filters.status) {
    where.status = filters.status;
  }

  const payments = await prisma.servicePayment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 50,
    include: {
      manager: { select: { id: true, name: true, email: true } },
      invoice: { select: { id: true, periodStart: true, periodEnd: true, status: true, subtotalAmount: true, feeAmount: true } },
    },
  });

  return payments.map((p: any) => ({
    ...mapPaymentToResult(p),
    manager: p.manager,
    invoice: p.invoice,
  }));
}

// ─── Owner: get single service payment ───────────────────────────────────────

export async function getOwnerServicePayment(paymentId: string): Promise<any | null> {
  const payment = await prisma.servicePayment.findUnique({
    where: { id: paymentId },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      invoice: { select: { id: true, periodStart: true, periodEnd: true, status: true, subtotalAmount: true, feeAmount: true } },
    },
  });

  if (!payment) return null;

  return {
    ...mapPaymentToResult(payment),
    manager: (payment as any).manager,
    invoice: (payment as any).invoice,
  };
}

// ─── Timeout stale PENDING payments ──────────────────────────────────────────

export async function timeoutStalePendingPayments(): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_TIMEOUT_MS);

  const result = await prisma.servicePayment.updateMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: cutoff },
    },
    data: {
      status: 'FAILED',
      failureReason: 'TIMEOUT',
    },
  });

  if (result.count > 0) {
    console.log(`[ServicePayment] Timed out ${result.count} stale PENDING payment(s)`);
  }

  return result.count;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function failPayment(paymentId: string, reason: string): Promise<void> {
  await prisma.servicePayment.update({
    where: { id: paymentId },
    data: { status: 'FAILED', failureReason: reason },
  });
}

function mapPaymentToResult(payment: any): PaymentStatusResult {
  return {
    paymentId: payment.id,
    invoiceId: payment.invoiceId,
    externalRef: payment.externalRef,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    network: payment.network,
    phoneNumber: payment.phoneNumber,
    providerTxId: payment.providerTxId || null,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

// ─── Custom error class ──────────────────────────────────────────────────────

export class ServicePaymentError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'ServicePaymentError';
    this.statusCode = statusCode;
  }
}
