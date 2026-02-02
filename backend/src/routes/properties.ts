import { Router } from 'express';
import { createProperty, getAllProperties, getPropertyById, updateProperty, deleteProperty, createUnit, updateUnit, deleteUnit } from '../controllers/propertyController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';

const router = Router();

// POST /api/properties - Create property (Manager only)
router.post('/',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  createProperty
);

// GET /api/properties - Get all properties (Tenant via lease, Manager via ownership)
router.get('/',
  authenticateToken,
  getAllProperties
);

// GET /api/properties/:id - Get property by ID (Tenant via lease, Manager via ownership)
router.get('/:id',
  authenticateToken,
  getPropertyById
);

// PATCH /api/properties/:id - Update property (Manager only, ownership check)
router.patch('/:id',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  updateProperty
);

// DELETE /api/properties/:id - Delete property (Manager only, ownership check)
router.delete('/:id',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  deleteProperty
);

// UNIT ROUTES

// POST /api/properties/:id/units - Create unit (Manager only, must own property)
router.post('/:id/units',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  createUnit
);

// PATCH /api/units/:unitId - Update unit (Manager only, must own parent property)
router.patch('/units/:unitId',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  updateUnit
);

// DELETE /api/units/:unitId - Delete unit (Manager only, must own parent property)
router.delete('/units/:unitId',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  deleteUnit
);

export { router as propertyRoutes };
