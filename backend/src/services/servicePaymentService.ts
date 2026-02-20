import { prisma } from '../utils/database';
import { getPaymentProvider } from './paymentProviders';
import { WebhookPayload } from './paymentProviders/types';

/**
 * Generates a unique external reference for a service payment attempt.
 */
function generateExternalRef(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `SPAY-${ts}-${rand}`.toUpperCase();
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
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, managerId },
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

  // 2. Check for existing PENDING payment on this invoice
  const existingPending = await prisma.servicePayment.findFirst({
    where: { invoiceId, status: 'PENDING' },
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

  // 3. Calculate amount (subtotal + fee)
  const amount = invoice.subtotalAmount + invoice.feeAmount;

  // 4. Generate external ref and call provider
  const externalRef = generateExternalRef();
  const provider = getPaymentProvider();

  const pushResponse = await provider.initiatePush({
    phoneNumber,
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
      phoneNumber,
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

  // 1. Parse webhook
  const result = provider.parseWebhook(payload);

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

  // 4. Update payment status
  const newStatus = result.success ? 'SUCCESS' : 'FAILED';

  await prisma.servicePayment.update({
    where: { id: payment.id },
    data: {
      status: newStatus,
      providerTxId: result.providerTxId,
      failureReason: result.failureReason || null,
    },
  });

  console.log(`[ServicePayment] Webhook: payment ${payment.id} → ${newStatus}`);

  // 5. On success: mark invoice PAID and recompute manager billing
  if (result.success) {
    await markInvoicePaidAndRecompute(payment.invoiceId, payment.managerId);
  }

  return { ok: true, paymentId: payment.id, status: newStatus };
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
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getPaymentStatus(paymentId: string, managerId: string): Promise<PaymentStatusResult | null> {
  const payment = await prisma.servicePayment.findFirst({
    where: { id: paymentId, managerId },
  });

  if (!payment) return null;

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
    failureReason: payment.failureReason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

// ─── Internal: mark invoice paid + recompute manager billing ─────────────────

async function markInvoicePaidAndRecompute(invoiceId: string, managerId: string): Promise<void> {
  // Mark invoice as PAID
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'PAID' },
  });

  console.log(`[ServicePayment] Invoice ${invoiceId} marked PAID`);

  // Recompute: only unlock manager if no other OVERDUE invoices remain
  const remainingOverdue = await prisma.invoice.count({
    where: {
      managerId,
      status: 'OVERDUE',
      id: { not: invoiceId },
    },
  });

  if (remainingOverdue === 0) {
    await prisma.user.update({
      where: { id: managerId },
      data: {
        billingStatus: 'CURRENT',
        billingGraceUntil: null,
      },
    });
    console.log(`[ServicePayment] Manager ${managerId} billing set to CURRENT (no remaining overdue)`);
  } else {
    console.log(`[ServicePayment] Manager ${managerId} still has ${remainingOverdue} overdue invoice(s)`);
  }
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
