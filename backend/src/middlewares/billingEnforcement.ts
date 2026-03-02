import { Response } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../types/prisma';
import { prisma } from '../utils/database';

// Billing status constants to match schema enum
const BillingStatus = {
  CURRENT: 'CURRENT',
  OVERDUE: 'OVERDUE',
  RESTRICTED: 'RESTRICTED',
  SUSPENDED: 'SUSPENDED'
} as const;

export const requireManagerTermsAccepted = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    // Only applies to managers
    if (req.user?.role !== UserRole.MANAGER) {
      return next();
    }

    // Query DB for fresh terms acceptance status (not JWT which may be stale)
    const freshUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { managerTermsAcceptedAt: true }
    });

    // Check if terms have been accepted
    if (!freshUser?.managerTermsAcceptedAt) {
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

    const billingStatus = freshUser?.billingStatus || BillingStatus.CURRENT;
    const graceUntil = freshUser?.billingGraceUntil;

    // Allow CURRENT status
    if (billingStatus === BillingStatus.CURRENT) {
      return next();
    }

    // OVERDUE: Allow with warnings (handled in response injection)
    if (billingStatus === BillingStatus.OVERDUE) {
      // Check if still within grace period
      if (graceUntil && new Date() < new Date(graceUntil)) {
        return next();
      }
      // Continue for OVERDUE - warnings handled elsewhere
      return next();
    }

    // RESTRICTED/SUSPENDED: Block access
    const restrictionMessage = billingStatus === BillingStatus.SUSPENDED
      ? 'Account suspended. Pay outstanding invoices to restore access.'
      : 'Account restricted. Pay outstanding invoices to restore full access.';

    res.status(402).json({
      success: false,
      code: 'ACCOUNT_RESTRICTED',
      message: restrictionMessage,
      billingStatus,
      requiresAction: 'PAY_BILLING_INVOICE',
      graceUntil
    });
    return;

  } catch (error) {
    console.error('Billing enforcement middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const requireRestrictedOperations = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    // Only applies to managers
    if (!req.user || req.user.role !== UserRole.MANAGER) {
      return next();
    }

    // Query DB for fresh billing status
    const freshUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { billingStatus: true }
    });

    const billingStatus = freshUser?.billingStatus || BillingStatus.CURRENT;

    // Block RESTRICTED and SUSPENDED from creation operations
    if (billingStatus === BillingStatus.RESTRICTED || billingStatus === BillingStatus.SUSPENDED) {
      const code = billingStatus === BillingStatus.SUSPENDED ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_RESTRICTED';
      const message = billingStatus === BillingStatus.SUSPENDED
        ? 'Account suspended. All operations blocked except billing and payments.'
        : 'Cannot create new resources while account is restricted. Please pay outstanding invoices.';

      res.status(402).json({
        success: false,
        code,
        message,
        billingStatus,
        requiresAction: 'PAY_BILLING_INVOICE'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Restricted operations enforcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const requireSuspendedOperations = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    // Only applies to managers
    if (!req.user || req.user.role !== UserRole.MANAGER) {
      return next();
    }

    // Query DB for fresh billing status
    const freshUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { billingStatus: true }
    });

    const billingStatus = freshUser?.billingStatus || BillingStatus.CURRENT;

    // Block SUSPENDED from all operations except billing
    if (billingStatus === BillingStatus.SUSPENDED) {
      res.status(402).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account suspended. Only billing operations are allowed. Please pay outstanding invoices.',
        billingStatus,
        requiresAction: 'PAY_BILLING_INVOICE'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Suspended operations enforcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
