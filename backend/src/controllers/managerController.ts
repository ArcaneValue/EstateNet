import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import {
  getDashboardData as getDashboardDataService,
  getManagerLeases as getManagerLeasesService,
  getManagerInvitations as getManagerInvitationsService,
  ManagerLeasesFilters,
  ManagerInvitationsFilters,
} from '../services/managerService';

export const getDashboardData = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const managerId = req.user?.id;
    if (!managerId) {
      res.status(401).json({
        success: false,
        message: 'Manager authentication required',
      });
      return;
    }

    const data = await getDashboardDataService(managerId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in getDashboardData controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getManagerLeases = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const managerId = req.user?.id;
    if (!managerId) {
      res.status(401).json({
        success: false,
        message: 'Manager authentication required',
      });
      return;
    }

    const filters: ManagerLeasesFilters = {
      propertyId: typeof req.query.propertyId === 'string' ? req.query.propertyId : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    };

    const data = await getManagerLeasesService(managerId, filters);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in getManagerLeases controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getManagerInvitations = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const managerId = req.user?.id;
    if (!managerId) {
      res.status(401).json({
        success: false,
        message: 'Manager authentication required',
      });
      return;
    }

    const filters: ManagerInvitationsFilters = {
      propertyId: typeof req.query.propertyId === 'string' ? req.query.propertyId : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    };

    const data = await getManagerInvitationsService(managerId, filters);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in getManagerInvitations controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
