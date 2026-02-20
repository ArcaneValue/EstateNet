import { Router } from 'express';
import {
  getBillingStatus,
  getInvoices,
  getInvoiceById,
  generateInvoice,
  markInvoicePaid,
  forceManagerBillingOverdue,
  clearManagerBillingOverdue,
  runScheduler
} from '../controllers/billingController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';
import { initiateInvoicePayment, getPaymentStatusHandler } from '../controllers/servicePaymentController';

const router = Router();

// GET /api/manager/billing/status - Get current billing status
router.get('/billing/status',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getBillingStatus
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

export { router as billingRoutes };
