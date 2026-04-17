import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';
import { UserRole } from '../types/prisma';
import { generateToken } from '../utils/jwt';

export const getManagerTerms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Only managers can access this endpoint
    if (req.user?.role !== UserRole.MANAGER) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Manager role required.'
      });
      return;
    }

    // Check if terms have been accepted
    const hasAcceptedTerms = !!req.user.managerTermsAcceptedAt;

    res.status(200).json({
      success: true,
      data: {
        termsVersion: '1.0',
        termsAcceptedAt: req.user.managerTermsAcceptedAt,
        hasAcceptedTerms
      }
    });

  } catch (error) {
    console.error('Get manager terms error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const acceptManagerTerms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Only managers can access this endpoint
    if (req.user?.role !== UserRole.MANAGER) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Manager role required.'
      });
      return;
    }

    // Update user record with terms acceptance timestamp
    // Accept BOTH manager terms AND billing terms at once
    console.log('[Terms] Updating user:', req.user.id, 'with role:', req.user?.role);
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        managerTermsAcceptedAt: new Date(),
        billingTermsAcceptedAt: new Date() // Also accept billing terms
      }
    });
    console.log('[Terms] User updated successfully - both manager and billing terms accepted');

    // Generate new token with updated user data
    const newToken = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      tenantId: updatedUser.tenantId || undefined,
      phoneNumber: updatedUser.phoneNumber || undefined,
      managerTermsAcceptedAt: updatedUser.managerTermsAcceptedAt?.toISOString() || null,
      billingStatus: updatedUser.billingStatus || null,
      billingGraceUntil: updatedUser.billingGraceUntil?.toISOString() || null
    });

    res.status(200).json({
      success: true,
      message: 'Terms and conditions accepted successfully',
      data: {
        termsAcceptedAt: updatedUser.managerTermsAcceptedAt,
        token: newToken // Return new token with updated data
      }
    });

  } catch (error) {
    console.error('Accept manager terms error:', error);

    // Handle specific case where user is not found
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      res.status(401).json({
        success: false,
        message: 'User session expired. Please log out and log back in.'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
