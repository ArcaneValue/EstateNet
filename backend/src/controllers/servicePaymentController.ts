import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { UserRole } from '../types/prisma';
import {
  initiatePayment,
  processWebhook,
  getPaymentStatus,
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
