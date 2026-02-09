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
        createdAt: true,
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

    const { name, phoneNumber, profileImageUrl, notificationPrefs } = req.body;
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
        res.status(400).json({
          success: false,
          message: `Invalid notificationPrefs: ${error.message}`,
        });
        return;
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
