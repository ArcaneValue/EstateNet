import { Response } from 'express';
import { TenantService } from '../services/tenantService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { LeaseStatus } from '../types/prisma';
import { prisma } from '../utils/database';

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

export const createLease = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  console.log('=== CREATE LEASE REQUEST START ===');

  try {
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('User role:', req.user?.role);
    console.log('User ID:', req.user?.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    if (!req.user || req.user.role !== 'MANAGER' || !req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Only managers can create leases'
      });
      return;
    }

    const { tenantId, propertyId, unitId, rentAmount, startDate } = req.body;

    if (!tenantId || !propertyId || !unitId || !rentAmount) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: tenantId, propertyId, unitId, rentAmount'
      });
      return;
    }

    // Verify manager owns property
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        managerId: req.user.id
      }
    });

    if (!property) {
      res.status(403).json({
        success: false,
        message: 'You can only create leases for properties you manage'
      });
      return;
    }

    // Verify unit exists and belongs to property
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        propertyId
      }
    });

    if (!unit) {
      res.status(400).json({
        success: false,
        message: 'Unit not found or does not belong to specified property'
      });
      return;
    }

    const lease = await tenantService.createLease({
      tenantId,
      propertyId,
      unitId,
      rentAmount: parseInt(rentAmount)
    });

    console.log('=== LEASE CREATED SUCCESSFULLY ===');
    console.log('Lease ID:', lease.id);
    console.log('Tenant ID:', lease.tenantId);
    console.log('Property ID:', lease.propertyId);
    console.log('Unit ID:', lease.unitId);

    res.status(201).json({
      success: true,
      data: lease
    });
  } catch (error) {
    console.error('=== CREATE LEASE ERROR ===');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Prisma code:', (error as any)?.code || 'None');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

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
    if (!req.user || req.user.role !== 'MANAGER' || !req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Only managers can end leases'
      });
      return;
    }

    // Derive properties this manager manages via TenantInvitation
    const managerProperties = await (prisma as any).tenantInvitation.findMany({
      where: {
        invitedByUserId: req.user.id
      },
      select: {
        propertyId: true
      },
      distinct: ['propertyId']
    });

    const allowedPropertyIds: string[] = managerProperties.map((inv: any) => inv.propertyId);

    if (allowedPropertyIds.length === 0) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to end any leases'
      });
      return;
    }

    // Fetch lease to validate it belongs to one of the manager's properties
    const leaseRecord = await (prisma as any).lease.findUnique({
      where: { id: leaseId }
    });

    if (!leaseRecord) {
      res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
      return;
    }

    if (!allowedPropertyIds.includes(leaseRecord.propertyId)) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to end leases for this property'
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
