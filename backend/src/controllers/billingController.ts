import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';
import { UserRole } from '../types/prisma';

// Fee rate: 3.99% = 399 basis points
const FEE_RATE_BPS = 399;
const FEE_RATE = 0.0399;

export const getBillingStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Only managers can access this endpoint
    if (req.user?.role !== UserRole.MANAGER) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Manager role required.'
      });
      return;
    }

    // Query DB for fresh billing status (not JWT which may be stale)
    const freshUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { billingStatus: true, billingGraceUntil: true, managerTermsAcceptedAt: true }
    });

    const billingStatus = freshUser?.billingStatus || 'CURRENT';
    const graceUntil = freshUser?.billingGraceUntil;
    const termsAcceptedAt = freshUser?.managerTermsAcceptedAt;

    // Get current invoice if exists (Option A: invoices are immutable snapshots)
    const currentInvoice = await prisma.invoice.findFirst({
      where: {
        managerId: req.user.id,
        status: { in: ['DUE', 'OVERDUE'] }
      },
      orderBy: {
        dueDate: 'asc'
      },
      include: {
        lines: {
          include: {
            property: true,
            unit: true,
            lease: {
              include: {
                tenantIdentity: true
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        billingStatus,
        graceUntil,
        termsAcceptedAt: termsAcceptedAt,
        currentInvoice: currentInvoice ? {
          id: currentInvoice.id,
          periodStart: currentInvoice.periodStart,
          periodEnd: currentInvoice.periodEnd,
          subtotalAmount: currentInvoice.subtotalAmount,
          feeAmount: currentInvoice.feeAmount,
          totalAmount: currentInvoice.subtotalAmount + currentInvoice.feeAmount, // For reference only
          serviceFeeDue: currentInvoice.feeAmount, // Actual payable amount
          dueDate: currentInvoice.dueDate,
          status: currentInvoice.status,
          lineCount: currentInvoice.lines.length
        } : null
      }
    });

  } catch (error) {
    console.error('Get billing status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const forceManagerBillingOverdue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Development/owner only endpoint
    if (process.env.NODE_ENV !== 'development' && req.user?.role !== UserRole.OWNER) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Development/Owner role required.'
      });
      return;
    }

    const { managerId } = req.body;
    if (!managerId) {
      res.status(400).json({
        success: false,
        message: 'managerId is required'
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: managerId },
      data: {
        billingStatus: 'OVERDUE',
        billingGraceUntil: null
      },
      select: {
        id: true,
        billingStatus: true,
        billingGraceUntil: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Manager billing set to OVERDUE (dev)',
      data: updatedUser
    });
  } catch (error) {
    console.error('Force billing overdue error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const clearManagerBillingOverdue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Development/owner only endpoint
    if (process.env.NODE_ENV !== 'development' && req.user?.role !== UserRole.OWNER) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Development/Owner role required.'
      });
      return;
    }

    const { managerId } = req.body;
    if (!managerId) {
      res.status(400).json({
        success: false,
        message: 'managerId is required'
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: managerId },
      data: {
        billingStatus: 'CURRENT',
        billingGraceUntil: null
      },
      select: {
        id: true,
        billingStatus: true,
        billingGraceUntil: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Manager billing set to CURRENT (dev)',
      data: updatedUser
    });
  } catch (error) {
    console.error('Clear billing overdue error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getInvoices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Only managers can access this endpoint
    if (req.user?.role !== UserRole.MANAGER) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Manager role required.'
      });
      return;
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        managerId: req.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        lines: {
          include: {
            property: true,
            unit: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: invoices.map(invoice => ({
        id: invoice.id,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        subtotalAmount: invoice.subtotalAmount,
        feeAmount: invoice.feeAmount,
        totalAmount: invoice.subtotalAmount + invoice.feeAmount, // For reference only
        serviceFeeDue: invoice.feeAmount, // Actual payable amount
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt || null,
        createdAt: invoice.createdAt,
        lineCount: invoice.lines.length
      }))
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getInvoiceById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Only managers can access this endpoint
    if (req.user?.role !== UserRole.MANAGER) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Manager role required.'
      });
      return;
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        managerId: req.user.id
      },
      include: {
        lines: {
          include: {
            property: true,
            unit: true,
            lease: {
              include: {
                tenantIdentity: true
              }
            }
          }
        }
      }
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: invoice.id,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        subtotalAmount: invoice.subtotalAmount,
        feeRateBps: invoice.feeRateBps,
        feeAmount: invoice.feeAmount,
        totalAmount: invoice.subtotalAmount + invoice.feeAmount, // For reference only
        serviceFeeDue: invoice.feeAmount, // Actual payable amount
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt || null,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        lines: invoice.lines.map(line => ({
          id: line.id,
          propertyId: line.propertyId,
          unitId: line.unitId,
          rentAmount: line.rentAmount,
          tenantId: line.tenantId,
          leaseId: line.leaseId,
          property: line.property,
          unit: line.unit,
          tenant: line.lease?.tenantIdentity || null
        }))
      }
    });

  } catch (error) {
    console.error('Get invoice by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const generateInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Development/owner only endpoint
    if (process.env.NODE_ENV !== 'development' && req.user?.role !== UserRole.OWNER) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Development/Owner role required.'
      });
      return;
    }

    const { managerId, periodStart, periodEnd } = req.body;

    if (!managerId || !periodStart || !periodEnd) {
      res.status(400).json({
        success: false,
        message: 'managerId, periodStart, and periodEnd are required'
      });
      return;
    }

    // Get all occupied units for the manager in the period (Option A: snapshot-at-periodStart)
    console.log(`[DEV] Searching for leases with managerId: ${managerId}, periodStart: ${periodStart}`);

    // First, check if any leases exist for this manager at all
    const allManagerLeases = await prisma.lease.findMany({
      where: {
        property: {
          managerId: managerId
        }
      },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        rentAmount: true,
        property: {
          select: {
            id: true,
            managerId: true
          }
        }
      }
    });

    console.log(`[DEV] Found ${allManagerLeases.length} total leases for manager ${managerId}`);
    allManagerLeases.forEach(lease => {
      console.log(`[DEV] Lease ${lease.id}: status=${lease.status}, startDate=${lease.startDate?.toISOString()}, endDate=${lease.endDate?.toISOString()}, rent=${lease.rentAmount}`);
    });

    const occupiedUnits = await prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        property: {
          managerId: managerId
        },
        startDate: {
          lte: new Date(periodStart)  // Option A: only leases active AT periodStart
        },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date(periodStart) } }
        ]
      },
      include: {
        property: true,
        unit: true,
        tenantIdentity: true
      }
    });

    console.log(`[DEV] Found ${occupiedUnits.length} occupied units for period ${periodStart}`);

    if (occupiedUnits.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No occupied units found for the specified period'
      });
      return;
    }

    // Calculate subtotal
    const subtotalAmount = occupiedUnits.reduce((sum, lease) => sum + lease.rentAmount, 0);
    const feeAmount = Math.round(subtotalAmount * FEE_RATE);

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        managerId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        subtotalAmount,
        feeRateBps: FEE_RATE_BPS,
        feeAmount,
        status: 'DUE',
        dueDate: new Date(new Date(periodEnd).getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after period end
        lines: {
          create: occupiedUnits.map(lease => ({
            propertyId: lease.propertyId,
            unitId: lease.unitId,
            rentAmount: lease.rentAmount,
            tenantId: lease.tenantId,
            leaseId: lease.id
          }))
        }
      },
      include: {
        lines: true
      }
    });

    console.log(`[DEV] Generated invoice ${invoice.id} for manager ${managerId}: ${invoice.feeAmount} UGX fee`);

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice
    });

  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const markInvoicePaid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Development/owner only endpoint
    if (process.env.NODE_ENV !== 'development' && req.user?.role !== UserRole.OWNER) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Development/Owner role required.'
      });
      return;
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id }
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    // Update invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID'
      }
    });

    // Recompute manager billing status: only unlock if no other OVERDUE invoices remain
    const remainingOverdue = await prisma.invoice.count({
      where: {
        managerId: invoice.managerId,
        status: 'OVERDUE',
        id: { not: id }
      }
    });

    if (remainingOverdue === 0) {
      await prisma.user.update({
        where: { id: invoice.managerId },
        data: {
          billingStatus: 'CURRENT',
          billingGraceUntil: null
        }
      });
      console.log(`[DEV] Marked invoice ${id} as paid, manager ${invoice.managerId} billing set to CURRENT (no remaining overdue)`);
    } else {
      console.log(`[DEV] Marked invoice ${id} as paid, manager ${invoice.managerId} still has ${remainingOverdue} overdue invoice(s)`);
    }

    res.status(200).json({
      success: true,
      message: 'Invoice marked as paid successfully',
      data: updatedInvoice
    });

  } catch (error) {
    console.error('Mark invoice paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const runScheduler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Only allow owners or dev users to run scheduler manually
    if (req.user?.role !== UserRole.OWNER) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Owner role required.'
      });
      return;
    }

    // Import and run the scheduler
    const { runDailyBillingTasks } = await import('../services/billingScheduler');
    const results = await runDailyBillingTasks();

    console.log(`[Scheduler] Manual execution completed:`, results);

    res.status(200).json({
      success: true,
      message: 'Scheduler executed successfully',
      data: results
    });

  } catch (error) {
    console.error('Run scheduler error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
