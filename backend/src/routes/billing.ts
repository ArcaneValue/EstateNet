import { Router, Response } from 'express';
import {
  getBillingStatus,
  getBillingOverview,
  getInvoices,
  getInvoiceById,
  generateInvoice,
  markInvoicePaid,
  forceManagerBillingOverdue,
  clearManagerBillingOverdue,
  runScheduler,
  recalculateInvoices
} from '../controllers/billingController';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';
import { initiateInvoicePayment, getPaymentStatusHandler, listManagerPaymentsHandler, getManagerPaymentHandler } from '../controllers/servicePaymentController';

const router = Router();

// GET /api/manager/billing/status - Get current billing status
router.get('/billing/status',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getBillingStatus
);

// GET /api/manager/billing/overview - Get comprehensive billing overview
router.get('/billing/overview',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getBillingOverview
);

// GET /api/manager/billing/invoices - List all invoices for manager
router.get('/billing/invoices',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getInvoices
);

// GET /api/manager/billing/invoices/:id - Get invoice details
router.get('/billing/invoices/:id',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getInvoiceById
);

// POST /api/manager/billing/invoices/:invoiceId/pay - Initiate payment for invoice (MANAGER)
router.post('/billing/invoices/:invoiceId/pay',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  initiateInvoicePayment
);

// GET /api/manager/billing/payments/:paymentId - Poll payment status (MANAGER)
router.get('/billing/payments/:paymentId',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getPaymentStatusHandler
);

// GET /api/manager/billing/service-payments - List manager's service payment history
router.get('/billing/service-payments',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  listManagerPaymentsHandler
);

// GET /api/manager/billing/service-payments/:id - Get single service payment detail
router.get('/billing/service-payments/:id',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getManagerPaymentHandler
);

// POST /api/manager/billing/generate - Generate invoice (DEV/OWNER only)
router.post('/billing/generate',
  authenticateToken,
  requireUserRole(UserRole.OWNER),
  generateInvoice
);

// POST /api/manager/billing/mark-paid/:id - Mark invoice as paid (DEV/OWNER only)
router.post('/billing/mark-paid/:id',
  authenticateToken,
  requireUserRole(UserRole.OWNER),
  markInvoicePaid
);

// POST /api/manager/billing/dev/force-overdue - Force manager billing to OVERDUE (DEV/OWNER only)
router.post('/billing/dev/force-overdue',
  authenticateToken,
  requireUserRole(UserRole.OWNER),
  forceManagerBillingOverdue
);

// POST /api/manager/billing/dev/clear-overdue - Clear manager billing to CURRENT (DEV/OWNER only)
router.post('/billing/dev/clear-overdue',
  authenticateToken,
  requireUserRole(UserRole.OWNER),
  clearManagerBillingOverdue
);

// POST /api/billing/scheduler/run - Run billing scheduler manually (DEV/OWNER only)
router.post('/billing/scheduler/run',
  authenticateToken,
  requireUserRole(UserRole.OWNER),
  runScheduler
);

// POST /api/billing/recalculate-invoices - Recalculate unpaid invoices with new formula (OWNER only)
router.post('/billing/recalculate-invoices',
  authenticateToken,
  requireUserRole(UserRole.OWNER),
  recalculateInvoices
);

// GET /api/billing/my-invoices - Get invoices for current user (OWNER/MANAGER)
router.get('/billing/my-invoices',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { prisma } = await import('../utils/database');

      const invoices = await (prisma.invoice as any).findMany({
        where: { billedUserId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        include: {
          lines: {
            include: {
              property: true,
              unit: true
            }
          }
        }
      });

      return res.json({ success: true, invoices });
    } catch (error) {
      console.error('Get my invoices error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
    }
  }
);

// GET /api/billing/summary - Get billing summary for current user (OWNER/MANAGER)
router.get('/billing/summary',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { prisma } = await import('../utils/database');

      const invoices = await (prisma.invoice as any).findMany({
        where: { billedUserId: req.user!.id }
      });

      const outstanding = invoices
        .filter((inv: any) => inv.status !== 'PAID')
        .reduce((sum: number, inv: any) => sum + inv.feeAmount, 0);

      const unpaidCount = invoices.filter((inv: any) => inv.status !== 'PAID').length;
      const overdue = invoices.filter((inv: any) => inv.status === 'OVERDUE').length;

      return res.json({ success: true, outstanding, unpaidCount, overdue });
    } catch (error) {
      console.error('Get billing summary error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch billing summary' });
    }
  }
);

// GET /api/billing/managed-invoices - Get invoices for properties managed by current user
router.get('/billing/managed-invoices',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { prisma } = await import('../utils/database');

      // Get properties managed by this user
      const managedProperties = await prisma.property.findMany({
        where: { managerId: req.user!.id },
        select: { id: true }
      });

      const propertyIds = managedProperties.map(p => p.id);

      // Get invoices for these properties (where user is NOT the billed user)
      const invoices = await (prisma.invoice as any).findMany({
        where: {
          billedUserId: { not: req.user!.id },
          lines: {
            some: {
              propertyId: { in: propertyIds }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          billedUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          lines: {
            include: {
              property: true,
              unit: true
            }
          }
        }
      });

      return res.json({ success: true, invoices });
    } catch (error) {
      console.error('Get managed invoices error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch managed invoices' });
    }
  }
);

export { router as billingRoutes };
