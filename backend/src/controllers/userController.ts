// Canonical notification preferences schema
// { payments: boolean, messages: boolean, invitations: boolean }
const CANONICAL_NOTIFICATION_KEYS = ['payments', 'messages', 'invitations'] as const;
type CanonicalNotificationPrefs = {
  payments?: boolean;
  messages?: boolean;
  invitations?: boolean;
};

import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';

/**
 * Validate and normalize notification preferences to canonical schema
 * - Strips unknown keys (logs warning)
 * - Sets defaults for missing keys
 * - Returns null if input is null/undefined
 */
function normalizeNotificationPrefs(input: unknown): CanonicalNotificationPrefs | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('notificationPrefs must be an object');
  }

  const result: CanonicalNotificationPrefs = {};
  const inputObj = input as Record<string, unknown>;

  // Known keys - validate as boolean
  for (const key of CANONICAL_NOTIFICATION_KEYS) {
    if (key in inputObj) {
      const val = inputObj[key];
      if (typeof val !== 'boolean') {
        throw new Error(`notificationPrefs.${key} must be a boolean`);
      }
      result[key] = val;
    }
  }

  // Check for unknown keys and strip them (with warning)
  const unknownKeys = Object.keys(inputObj).filter(k => !CANONICAL_NOTIFICATION_KEYS.includes(k as any));
  if (unknownKeys.length > 0) {
    console.warn(`[notificationPrefs] Stripping unknown keys: ${unknownKeys.join(', ')}`);
  }

  // Apply defaults for missing keys
  if (result.payments === undefined) result.payments = true;
  if (result.messages === undefined) result.messages = true;
  if (result.invitations === undefined) result.invitations = true;

  return result;
}

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phoneNumber: true,
        profileImage: true,
        notificationPrefs: true,
        tutorialFlags: true,
        createdAt: true,
        tenantId: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
    console.log('[getCurrentUser] Returning user notificationPrefs:', user.notificationPrefs);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { name, phoneNumber, profileImageUrl, notificationPrefs, tutorialFlags, payoutPhoneNumber, payoutNetwork } = req.body;
    console.log('[updateCurrentUser] Request body:', JSON.stringify(req.body, null, 2));

    const data: any = {};

    if (typeof name === 'string' && name.trim()) {
      data.name = name.trim();
    }

    if (typeof phoneNumber === 'string' || phoneNumber === null) {
      data.phoneNumber = phoneNumber;
    }

    if (typeof profileImageUrl === 'string' || profileImageUrl === null) {
      data.profileImage = profileImageUrl;
    }

    if (notificationPrefs !== undefined) {
      try {
        const normalized = normalizeNotificationPrefs(notificationPrefs);
        console.log('[updateCurrentUser] Received notificationPrefs:', notificationPrefs);
        console.log('[updateCurrentUser] Normalized notificationPrefs:', normalized);
        if (normalized !== null) {
          data.notificationPrefs = normalized;
        }
      } catch (error: any) {
        console.error('❌ Notification prefs validation error:', error);
        res.status(400).json({
          success: false,
          message: `Invalid notificationPrefs: ${error.message}`,
        });
        return;
      }
    }

    // Tutorial flags - merge with existing flags
    if (tutorialFlags !== undefined) {
      if (typeof tutorialFlags === 'object' && !Array.isArray(tutorialFlags)) {
        data.tutorialFlags = tutorialFlags;
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid tutorialFlags format. Must be an object',
        });
        return;
      }
    }

    // Manager payout fields validation (only for managers)
    if (req.user?.role === 'MANAGER') {
      if (payoutPhoneNumber !== undefined) {
        // Validate Uganda phone format: +2567XXXXXXXX or 07XXXXXXXX
        const phoneRegex = /^(\+2567|07)[0-9]{8}$/;
        if (typeof payoutPhoneNumber === 'string' && phoneRegex.test(payoutPhoneNumber)) {
          data.payoutPhoneNumber = payoutPhoneNumber;
        } else if (payoutPhoneNumber === null || payoutPhoneNumber === '') {
          data.payoutPhoneNumber = null;
        } else {
          res.status(400).json({
            success: false,
            message: 'Invalid payout phone number format. Use +2567XXXXXXXX or 07XXXXXXXX'
          });
          return;
        }
      }

      if (payoutNetwork !== undefined) {
        if (['MTN', 'AIRTEL'].includes(payoutNetwork)) {
          data.payoutNetwork = payoutNetwork;
        } else if (payoutNetwork === null || payoutNetwork === '') {
          data.payoutNetwork = null;
        } else {
          res.status(400).json({
            success: false,
            message: 'Invalid payout network. Must be MTN or AIRTEL'
          });
          return;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      });
      return;
    }

    const user = await (prisma as any).user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        phoneNumber: true,
        profileImage: true,
        notificationPrefs: true,
        tutorialFlags: true,
        payoutPhoneNumber: true,
        payoutNetwork: true,
        createdAt: true,
      },
    });

    console.log('[updateCurrentUser] Saved user notificationPrefs:', user.notificationPrefs);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    console.error('❌ Update current user error:', error);
    console.error('Error stack:', (error as Error).stack);
    res.status(500).json({
      success: false,
      message: `Internal server error: ${(error as Error).message}`,
    });
  }
};
