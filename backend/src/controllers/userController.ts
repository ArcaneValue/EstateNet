import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';

export const updateCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { name, phoneNumber, profileImageUrl, notificationPrefs } = req.body as {
      name?: string;
      phoneNumber?: string;
      profileImageUrl?: string | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notificationPrefs?: any;
    };

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
      data.notificationPrefs = notificationPrefs;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      });
      return;
    }

    const user = await (prisma as any).user.update({
      where: { id: req.user.id },
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
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    console.error('Update current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
