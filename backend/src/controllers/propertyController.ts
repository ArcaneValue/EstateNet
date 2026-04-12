import { Response } from 'express';
import { PropertyService, CreatePropertyData } from '../services/propertyService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';

const propertyService = new PropertyService();

export const createProperty = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, location, units, billedUserEmail }: CreatePropertyData & { billedUserEmail?: string | null } = req.body;

    // Validation
    if (!name || !location) {
      res.status(400).json({
        success: false,
        message: 'Name and location are required'
      });
      return;
    }

    // Determine billed user: if billedUserEmail is null/undefined, use current user (SELF)
    let billedUserId: string;

    if (!billedUserEmail) {
      // SELF - current user will be billed
      billedUserId = req.user!.id;
    } else {
      // OTHER - lookup user by email
      const billedUser = await (prisma.user as any).findUnique({
        where: { email: billedUserEmail },
        select: {
          id: true,
          role: true,
          billingTermsAcceptedAt: true
        }
      });

      if (!billedUser) {
        res.status(400).json({
          success: false,
          message: `User with email ${billedUserEmail} does not exist`
        });
        return;
      }

      if (!billedUser.billingTermsAcceptedAt) {
        res.status(400).json({
          success: false,
          message: `User ${billedUserEmail} must accept billing terms first`,
          requiresTermsAcceptance: true
        });
        return;
      }

      billedUserId = billedUser.id;
    }

    if (units) {
      for (const unit of units) {
        if (!unit.unitNumber || !unit.rentAmount) {
          res.status(400).json({
            success: false,
            message: 'Each unit must have unitNumber and rentAmount'
          });
          return;
        }
      }
    }

    // Only OWNER or MANAGER can create properties
    if (!req.user || (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER')) {
      res.status(403).json({
        success: false,
        message: 'Only owners or managers can create properties'
      });
      return;
    }

    // If SELF, verify current user has accepted billing terms
    if (!billedUserEmail) {
      const currentUser = await (prisma.user as any).findUnique({
        where: { id: req.user!.id },
        select: { billingTermsAcceptedAt: true }
      });

      if (!currentUser?.billingTermsAcceptedAt) {
        res.status(400).json({
          success: false,
          message: 'You must accept billing terms before creating a property',
          requiresTermsAcceptance: true
        });
        return;
      }
    }

    // Determine ownerId based on role and org linkage
    let ownerId = req.user.id;
    if (req.user.role === 'MANAGER' && req.user.createdByOwnerId) {
      // Manager belongs to an org - property owned by the org owner
      ownerId = req.user.createdByOwnerId;
    }

    const property = await (prisma.property as any).create({
      data: {
        name,
        location,
        ownerId,
        managerId: req.user.role === 'MANAGER' ? req.user.id : undefined,
        billedUserId,
        units: units ? {
          create: units.map(unit => ({
            unitNumber: unit.unitNumber,
            rentAmount: unit.rentAmount
          }))
        } : undefined
      },
      include: {
        units: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getAllProperties = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // TENANT: Lease-based scoping (UNCHANGED)
    if (req.user.role === 'TENANT') {
      if (!req.user.tenantId) {
        res.status(400).json({ success: false, message: 'Tenant ID not found' });
        return;
      }

      const leases = await prisma.lease.findMany({
        where: { tenantId: req.user.tenantId, status: 'ACTIVE' },
        select: { propertyId: true }
      });

      const propertyIds = leases.map(l => l.propertyId);

      if (propertyIds.length === 0) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      const properties = await prisma.property.findMany({
        where: { id: { in: propertyIds } },
        include: {
          units: {
            include: {
              leases: {
                where: { status: 'ACTIVE' },
                select: { id: true }
              }
            }
          }
        }
      });

      // Derive isOccupied from ACTIVE leases
      const propertiesWithOccupancy = properties.map(p => ({
        ...p,
        units: p.units.map(u => ({
          ...u,
          isOccupied: u.leases.length > 0
        }))
      }));

      res.status(200).json({ success: true, data: propertiesWithOccupancy });
      return;
    }

    // MANAGER: Own properties only
    if (req.user.role === 'MANAGER') {
      const properties = await prisma.property.findMany({
        where: { managerId: req.user.id },
        include: {
          units: {
            include: {
              leases: {
                where: { status: 'ACTIVE' },
                select: { id: true }
              }
            }
          },
          leases: {
            include: {
              tenantIdentity: {
                select: {
                  tenantId: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      // Derive isOccupied from ACTIVE leases
      const propertiesWithOccupancy = properties.map(p => ({
        ...p,
        units: p.units.map(u => ({
          ...u,
          isOccupied: u.leases.length > 0
        }))
      }));

      res.status(200).json({ success: true, data: propertiesWithOccupancy });
      return;
    }

    // OWNER: Own properties + properties managed by org managers
    if (req.user.role === 'OWNER') {
      const properties = await prisma.property.findMany({
        where: {
          OR: [
            { ownerId: req.user.id },
            { manager: { createdByOwnerId: req.user.id } }
          ]
        },
        include: {
          units: {
            include: {
              leases: {
                where: { status: 'ACTIVE' },
                select: { id: true }
              }
            }
          },
          leases: {
            include: {
              tenantIdentity: {
                select: {
                  tenantId: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      // Derive isOccupied from ACTIVE leases
      const propertiesWithOccupancy = properties.map(p => ({
        ...p,
        units: p.units.map(u => ({
          ...u,
          isOccupied: u.leases.length > 0
        }))
      }));

      res.status(200).json({ success: true, data: propertiesWithOccupancy });
      return;
    }

    res.status(403).json({ success: false, message: 'Access denied' });
  } catch (error) {
    console.error('Get all properties error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPropertyById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!id) {
      res.status(400).json({ success: false, message: 'Property ID required' });
      return;
    }

    // TENANT: Lease-based scoping (UNCHANGED)
    if (req.user.role === 'TENANT') {
      if (!req.user.tenantId) {
        res.status(400).json({ success: false, message: 'Tenant ID not found' });
        return;
      }

      const lease = await prisma.lease.findFirst({
        where: { tenantId: req.user.tenantId, propertyId: id, status: 'ACTIVE' }
      });

      if (!lease) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      const property = await prisma.property.findUnique({
        where: { id },
        include: {
          units: {
            include: {
              leases: {
                where: { status: 'ACTIVE' },
                select: { id: true }
              }
            }
          }
        }
      });

      if (!property) {
        res.status(404).json({ success: false, message: 'Property not found' });
        return;
      }

      // Derive isOccupied from ACTIVE leases
      const propertyWithOccupancy = {
        ...property,
        units: property.units.map(u => ({
          ...u,
          isOccupied: u.leases.length > 0
        }))
      };

      res.status(200).json({ success: true, data: propertyWithOccupancy });
      return;
    }

    // MANAGER: Own property only
    if (req.user.role === 'MANAGER') {
      const property = await prisma.property.findFirst({
        where: {
          id,
          managerId: req.user.id
        },
        include: {
          units: {
            include: {
              leases: {
                where: { status: 'ACTIVE' },
                select: { id: true }
              }
            }
          },
          leases: {
            include: {
              tenantIdentity: {
                select: {
                  tenantId: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!property) {
        // Return 403 to avoid leaking existence of properties managed by others
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      // Derive isOccupied from ACTIVE leases
      const propertyWithOccupancy = {
        ...property,
        units: property.units.map(u => ({
          ...u,
          isOccupied: u.leases.length > 0
        }))
      };

      res.status(200).json({ success: true, data: propertyWithOccupancy });
      return;
    }

    // OWNER: Own property only
    if (req.user.role === 'OWNER') {
      const property = await prisma.property.findFirst({
        where: {
          id,
          ownerId: req.user.id
        },
        include: {
          units: {
            include: {
              leases: {
                where: { status: 'ACTIVE' },
                select: { id: true }
              }
            }
          },
          leases: {
            include: {
              tenantIdentity: {
                select: {
                  tenantId: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!property) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      // Derive isOccupied from ACTIVE leases
      const propertyWithOccupancy = {
        ...property,
        units: property.units.map(u => ({
          ...u,
          isOccupied: u.leases.length > 0
        }))
      };

      res.status(200).json({ success: true, data: propertyWithOccupancy });
      return;
    }

    res.status(403).json({ success: false, message: 'Access denied' });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/*
Postman examples:

POST /api/properties
{
  "name": "Sunrise Apartments",
  "location": "Kampala, Nakasero",
  "units": [
    {
      "unitNumber": "101",
      "rentAmount": 1200000
    },
    {
      "unitNumber": "102",
      "rentAmount": 1400000
    }
  ]
}

GET /api/properties/property-id-here
*/

export const updateProperty = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, location, managerId } = req.body;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // OWNER: Can update own properties and assign/unassign managers
    if (req.user.role === 'OWNER') {
      const existingProperty = await prisma.property.findFirst({
        where: { id, ownerId: req.user.id }
      });

      if (!existingProperty) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      const property = await prisma.property.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(location && { location }),
          ...(managerId !== undefined && { managerId: managerId || null })
        },
        include: {
          units: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Property updated successfully',
        data: property
      });
      return;
    }

    // MANAGER: Can only update properties they manage
    if (req.user.role === 'MANAGER') {
      const existingProperty = await prisma.property.findFirst({
        where: { id, managerId: req.user.id }
      });

      if (!existingProperty) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      const property = await prisma.property.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(location && { location })
        },
        include: {
          units: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Property updated successfully',
        data: property
      });
      return;
    }

    res.status(403).json({ success: false, message: 'Access denied' });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteProperty = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'MANAGER') {
      res.status(403).json({ success: false, message: 'Only managers can delete properties' });
      return;
    }

    // Check if property exists and belongs to this manager
    const existingProperty = await prisma.property.findFirst({
      where: { id, managerId: req.user.id }
    });

    if (!existingProperty) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    await prisma.property.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// UNIT CRUD OPERATIONS

export const createUnit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: propertyId } = req.params;
    const { unitNumber, rentAmount } = req.body;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'MANAGER') {
      res.status(403).json({ success: false, message: 'Only managers can create units' });
      return;
    }

    // Verify property exists and belongs to this manager
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerId: req.user.id }
    });

    if (!property) {
      res.status(403).json({ success: false, message: 'Access denied - property not found or not owned' });
      return;
    }

    // Validation
    if (!unitNumber || rentAmount === undefined) {
      res.status(400).json({ success: false, message: 'unitNumber and rentAmount are required' });
      return;
    }

    const unit = await prisma.unit.create({
      data: {
        propertyId,
        unitNumber,
        rentAmount: parseInt(rentAmount)
      },
      include: { property: true }
    });

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unit
    });
  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateUnit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { unitId } = req.params;
    const { unitNumber, rentAmount } = req.body;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'MANAGER') {
      res.status(403).json({ success: false, message: 'Only managers can update units' });
      return;
    }

    // Verify unit exists and belongs to a property owned by this manager
    const unit = await prisma.unit.findFirst({
      where: { id: unitId },
      include: { property: true }
    });

    if (!unit || unit.property.managerId !== req.user.id) {
      res.status(403).json({ success: false, message: 'Access denied - unit not found or not owned' });
      return;
    }

    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
      data: {
        ...(unitNumber && { unitNumber }),
        ...(rentAmount !== undefined && { rentAmount: parseInt(rentAmount) })
      },
      include: { property: true }
    });

    res.status(200).json({
      success: true,
      message: 'Unit updated successfully',
      data: updatedUnit
    });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteUnit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { unitId } = req.params;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'MANAGER') {
      res.status(403).json({ success: false, message: 'Only managers can delete units' });
      return;
    }

    // Verify unit exists and belongs to a property owned by this manager
    const unit = await prisma.unit.findFirst({
      where: { id: unitId },
      include: { property: true }
    });

    if (!unit || unit.property.managerId !== req.user.id) {
      res.status(403).json({ success: false, message: 'Access denied - unit not found or not owned' });
      return;
    }

    await prisma.unit.delete({ where: { id: unitId } });

    res.status(200).json({
      success: true,
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
