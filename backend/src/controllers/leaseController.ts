import { Response } from 'express';
import { TenantService } from '../services/tenantService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { LeaseStatus } from '../types/prisma';

const tenantService = new TenantService();

export const getActiveLease = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID not found in user profile'
      });
      return;
    }

    const lease = await tenantService.getActiveLeaseByTenant(req.user.tenantId);

    res.status(200).json({
      success: true,
      data: lease
    });
  } catch (error) {
    console.error('Get active lease error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const endLease = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { leaseId } = req.params;
    const { reason } = req.body;

    if (!leaseId) {
      res.status(400).json({
        success: false,
        message: 'Lease ID is required'
      });
      return;
    }

    const endReason = reason || LeaseStatus.ENDED;
    if (!Object.values(LeaseStatus).includes(endReason)) {
      res.status(400).json({
        success: false,
        message: 'Invalid reason. Must be ENDED or EVICTED'
      });
      return;
    }

    const lease = await tenantService.endLease(leaseId, endReason);

    res.status(200).json({
      success: true,
      message: `Lease ${endReason.toLowerCase()} successfully`,
      data: lease
    });
  } catch (error) {
    console.error('End lease error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/*
Postman examples:

GET /api/tenant/me/active-lease
(no body needed)

POST /api/leases/lease-id-here/end
{
  "reason": "ENDED" // optional, defaults to ENDED
}
*/
