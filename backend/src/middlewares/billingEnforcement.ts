import { Response } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../types/prisma';
import { prisma } from '../utils/database';

export const requireManagerTermsAccepted = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    // Only applies to managers
    if (req.user?.role !== UserRole.MANAGER) {
      return next();
    }

    // Check if terms have been accepted
    if (!req.user.managerTermsAcceptedAt) {
      res.status(402).json({
        success: false,
        message: 'Terms and conditions must be accepted before using manager features',
        requiresTermsAcceptance: true,
        requiresAction: 'ACCEPT_TERMS'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Terms acceptance middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const requireCurrentBilling = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    // Only applies to managers
    if (!req.user || req.user.role !== UserRole.MANAGER) {
      return next();
    }

    // Query DB for fresh billing status (not JWT which may be stale)
    const freshUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { billingStatus: true, billingGraceUntil: true }
    });

    const billingStatus = freshUser?.billingStatus || 'CURRENT';
    const graceUntil = freshUser?.billingGraceUntil;

    // Check if billing is overdue
    if (billingStatus === 'OVERDUE') {
      // Check if still within grace period
      if (graceUntil && new Date() < new Date(graceUntil)) {
        return next();
      }

      res.status(402).json({
        success: false,
        message: 'Billing overdue. Please pay your invoice to continue using manager features.',
        billingOverdue: true,
        requiresAction: 'PAY_INVOICE',
        graceUntil
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Billing enforcement middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
