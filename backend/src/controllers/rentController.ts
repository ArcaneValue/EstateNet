import { Response } from 'express';
import { RentService } from '../services/rentService';
import { AuthenticatedRequest } from '../middlewares/auth';

const rentService = new RentService();

export const getTenantRentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID not found in user profile',
      });
      return;
    }

    const status = await rentService.getTenantRentStatus(req.user.tenantId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Get rent status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
