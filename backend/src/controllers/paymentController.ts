import { Response } from 'express';
import { PaymentService, CreatePaymentData } from '../services/paymentService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { NotificationService } from '../services/notificationService';
import { prisma } from '../utils/database';

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

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Tenants can only see their own payments, always scoped by their tenantId
    if (req.user.role === 'TENANT') {
      const tenantScopedId = req.user.tenantId;

      if (!tenantScopedId) {
        res.status(400).json({
          success: false,
          message: 'Tenant ID not found in user profile'
        });
        return;
      }

      const payments = await paymentService.getPayments(tenantScopedId, undefined);

      res.status(200).json({
        success: true,
        data: payments
      });
      return;
    }

    // Managers can only view payments for properties they manage
    if (req.user.role === 'MANAGER') {
      const managerId = req.user.id;

      if (!managerId) {
        res.status(401).json({
          success: false,
          message: 'Manager ID not found in user profile'
        });
        return;
      }

      // Scope payments by properties where managerId = req.user.id
      const queryTenantId = typeof tenantId === 'string' ? tenantId : undefined;
      const queryPropertyId = typeof propertyId === 'string' ? propertyId : undefined;

      // Build where clause scoped to manager's properties
      const whereClause: any = {
        property: {
          managerId: managerId
        }
      };

      if (queryTenantId) {
        whereClause.tenantId = queryTenantId;
      }

      if (queryPropertyId) {
        whereClause.propertyId = queryPropertyId;
      }

      const payments = await (prisma as any).payment.findMany({
        where: whereClause,
        include: {
          tenantIdentity: {
            select: {
              name: true,
              email: true
            }
          },
          property: {
            select: {
              name: true,
              location: true
            }
          },
          unit: {
            select: {
              unitNumber: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.status(200).json({
        success: true,
        data: payments
      });
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Only tenants and managers can access payments'
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
