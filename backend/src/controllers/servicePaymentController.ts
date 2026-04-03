import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { UserRole } from '../types/prisma';
import {
  initiatePayment,
  processWebhook,
  getPaymentStatus,
  listManagerServicePayments,
  getManagerServicePayment,
  listOwnerServicePayments,
  getOwnerServicePayment,
  ServicePaymentError,
} from '../services/servicePaymentService';

/**
 * POST /api/manager/billing/invoices/:invoiceId/pay
 * Body: { phoneNumber?: string, network?: string }
 * Manager initiates a push-prompt payment for a specific invoice.
 */
export const initiateInvoicePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== UserRole.MANAGER) {
      res.status(403).json({ success: false, message: 'Access denied. Manager role required.' });
      return;
    }

    const { invoiceId } = req.params;
    const { phoneNumber, network } = req.body;

    // Use provided phone or fall back to user's profile phone
    const phone = phoneNumber || req.user.phoneNumber;
    if (!phone) {
      res.status(400).json({ success: false, message: 'phoneNumber is required (none on profile)' });
      return;
    }

    const result = await initiatePayment({
      invoiceId,
      managerId: req.user.id,
      phoneNumber: phone,
      network: network || 'MTN',
    });

    res.status(201).json({
      success: true,
      message: 'Payment initiated. Check your phone for the payment prompt.',
      data: result,
    });
  } catch (error) {
    if (error instanceof ServicePaymentError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error('Initiate payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/manager/billing/payments/:paymentId
 * Manager polls for payment status.
 */
export const getPaymentStatusHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== UserRole.MANAGER) {
      res.status(403).json({ success: false, message: 'Access denied. Manager role required.' });
      return;
    }

    const { paymentId } = req.params;
    const result = await getPaymentStatus(paymentId, req.user.id);

    if (!result) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/manager/billing/service-payments
 * Manager lists their own service payment history.
 */
export const listManagerPaymentsHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== UserRole.MANAGER) {
      res.status(403).json({ success: false, message: 'Access denied. Manager role required.' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const data = await listManagerServicePayments(req.user.id, limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('List manager payments error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/manager/billing/service-payments/:id
 * Manager gets a single service payment detail.
 */
export const getManagerPaymentHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== UserRole.MANAGER) {
      res.status(403).json({ success: false, message: 'Access denied. Manager role required.' });
      return;
    }

    const data = await getManagerServicePayment(req.params.id, req.user.id);
    if (!data) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get manager payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/owner/billing/service-payments
 * Owner lists all service payments across managers.
 */
export const listOwnerPaymentsHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== UserRole.OWNER) {
      res.status(403).json({ success: false, message: 'Access denied. Owner role required.' });
      return;
    }

    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const data = await listOwnerServicePayments({ status, limit });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('List owner payments error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/owner/billing/service-payments/:id
 * Owner gets a single service payment detail.
 */
export const getOwnerPaymentHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== UserRole.OWNER) {
      res.status(403).json({ success: false, message: 'Access denied. Owner role required.' });
      return;
    }

    const data = await getOwnerServicePayment(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get owner payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/payments/webhook/mock
 * No authentication — called by the mock provider (or E2E test scripts).
 * Body: { externalRef: string, status: 'SUCCESS'|'FAILED', providerTxId?: string, failureReason?: string }
 */
export const handleMockWebhook = async (req: any, res: Response): Promise<void> => {
  try {
    // Only allow mock webhook in non-production or when PAYMENT_PROVIDER=MOCK
    const provider = (process.env.PAYMENT_PROVIDER || 'MOCK').toUpperCase();
    if (process.env.NODE_ENV === 'production' && provider !== 'MOCK') {
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }

    const result = await processWebhook({ body: req.body });

    if (!result.ok) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message || 'Webhook processed',
      data: { paymentId: result.paymentId, status: result.status },
    });
  } catch (error: any) {
    console.error('Mock webhook error:', error);
    res.status(400).json({ success: false, message: error.message || 'Webhook processing failed' });
  }
};

export const handleXyleWebhook = async (req: any, res: Response): Promise<void> => {
  try {
    console.log('[XyleWebhook] Received webhook', {
      headers: req.headers,
      bodyKeys: Object.keys(req.body || {}),
    });

    const result = await processWebhook({ body: req.body });

    if (!result.ok) {
      console.error('[XyleWebhook] Processing failed', { message: result.message });
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    console.log('[XyleWebhook] Processing successful', {
      paymentId: result.paymentId,
      status: result.status,
    });

    res.status(200).json({
      success: true,
      message: result.message || 'Webhook processed',
      data: { paymentId: result.paymentId, status: result.status },
    });
  } catch (error: any) {
    console.error('[XyleWebhook] Error:', error);
    res.status(400).json({ success: false, message: error.message || 'Webhook processing failed' });
  }
};
