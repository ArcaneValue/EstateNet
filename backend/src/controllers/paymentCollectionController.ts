import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';
import { UserRole } from '../types/prisma';

export const initiatePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Only tenants can initiate payments
    if (req.user?.role !== UserRole.TENANT) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Tenant role required.'
      });
      return;
    }

    const { amount, paymentMethod } = req.body;

    // Validate required fields
    if (!amount || !paymentMethod) {
      res.status(400).json({
        success: false,
        message: 'Amount and payment method are required'
      });
      return;
    }

    // Validate amount
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
      return;
    }

    // Get active lease for tenant
    const activeLease = await (prisma as any).lease.findFirst({
      where: {
        tenantId: req.user.tenantId,
        status: 'ACTIVE'
      },
      include: {
        property: true,
        unit: true
      }
    });

    if (!activeLease) {
      res.status(400).json({
        success: false,
        message: 'No active lease found'
      });
      return;
    }

    // Generate transaction reference
    const txRef = `EST_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create payment record
    const payment = await (prisma as any).payment.create({
      data: {
        tenantId: req.user.tenantId,
        propertyId: activeLease.propertyId,
        unitId: activeLease.unitId,
        amount: paymentAmount,
        status: 'PENDING',
        paymentMethod,
        txRef,
        paymentDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0]
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        paymentId: payment.id,
        status: payment.status,
        txRef: payment.txRef,
        amount: payment.amount
      }
    });

  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getPaymentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await (prisma as any).payment.findUnique({
      where: { id },
      include: {
        property: true,
        unit: true,
        tenantIdentity: true
      }
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const simulatePaymentSuccess = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;

    // Update payment status to PAID
    const updatedPayment = await (prisma as any).payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        completedAt: new Date().toISOString()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Payment simulated as successful',
      data: updatedPayment
    });

  } catch (error) {
    console.error('Simulate payment success error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
