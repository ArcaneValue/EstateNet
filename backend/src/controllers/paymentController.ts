import { Response } from 'express';
import { PaymentService, CreatePaymentData } from '../services/paymentService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { NotificationService } from '../services/notificationService';

const paymentService = new PaymentService();
const notificationService = new NotificationService();

export const recordPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { amount, paymentDate, dueDate, paymentMethod, transactionId } = req.body;

    // Validation
    if (!amount || !paymentDate || !dueDate) {
      res.status(400).json({
        success: false,
        message: 'Amount, payment date, and due date are required'
      });
      return;
    }

    if (!req.user?.tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID not found in user profile'
      });
      return;
    }

    const payment = await paymentService.recordPayment({
      tenantId: req.user.tenantId,
      propertyId: '', // Will be overridden by service
      unitId: '', // Will be overridden by service
      amount,
      paymentDate,
      dueDate,
      status: 'PAID',
      paymentMethod,
      transactionId
    });

    // Create notification for tenant
    try {
      if (req.user.id) {
        await notificationService.createNotification({
          userId: req.user.id,
          type: 'PAYMENT_RECEIVED',
          title: 'Payment recorded',
          body: `We have recorded your payment of ${amount}.`,
          metadata: {
            paymentId: payment.id,
            tenantId: req.user.tenantId,
            propertyId: payment.propertyId,
            unitId: payment.unitId,
            amount
          }
        });
      }
    } catch (notifyError) {
      console.error('Payment notification error:', notifyError);
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const getPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, propertyId } = req.query;

    // Tenants can only see their own payments
    let queryTenantId: string | undefined;
    if (req.user?.role === 'TENANT') {
      queryTenantId = req.user.tenantId;
    } else if (req.user?.role === 'MANAGER' && tenantId) {
      queryTenantId = tenantId as string;
    }

    const payments = await paymentService.getPayments(queryTenantId, propertyId as string);

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getPaymentSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'MANAGER') {
      res.status(403).json({
        success: false,
        message: 'Only managers can access payment summary'
      });
      return;
    }

    const { propertyId } = req.query;
    const summary = await paymentService.getPaymentSummary(propertyId as string);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/*
Postman examples:

POST /api/payments
{
  "amount": 1200000,
  "paymentDate": "2024-01-15T10:00:00Z",
  "dueDate": "2024-01-01T00:00:00Z",
  "paymentMethod": "Mobile Money",
  "transactionId": "TXN123456"
}

GET /api/payments
(no query params for tenant's own payments)
GET /api/payments?tenantId=T12345 (manager only)
GET /api/payments?propertyId=property-id (manager only)

GET /api/payments/summary
(no query params for all properties)
GET /api/payments/summary?propertyId=property-id
*/
