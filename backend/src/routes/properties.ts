import { Router } from 'express';
import { createProperty, getAllProperties, getPropertyById, updateProperty, deleteProperty, createUnit, updateUnit, deleteUnit } from '../controllers/propertyController';
import { authenticateToken } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import { requireManagerTermsAccepted, requireCurrentBilling } from '../middlewares/billingEnforcement';

const router = Router();

// POST /api/properties - Create property (Owner or Manager)
router.post('/',
  authenticateToken,
  requireRole('OWNER', 'MANAGER'),
  requireManagerTermsAccepted,
  requireCurrentBilling,
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

// PATCH /api/properties/:id - Update property (Owner or Manager, ownership check)
router.patch('/:id',
  authenticateToken,
  requireRole('OWNER', 'MANAGER'),
  updateProperty
);

// DELETE /api/properties/:id - Delete property (Owner or Manager, ownership check)
router.delete('/:id',
  authenticateToken,
  requireRole('OWNER', 'MANAGER'),
  deleteProperty
);

// UNIT ROUTES

// POST /api/properties/:id/units - Create unit (Owner or Manager, must own property)
router.post('/:id/units',
  authenticateToken,
  requireRole('OWNER', 'MANAGER'),
  requireManagerTermsAccepted,
  requireCurrentBilling,
  createUnit
);

// PATCH /api/units/:unitId - Update unit (Owner or Manager, must own parent property)
router.patch('/units/:unitId',
  authenticateToken,
  requireRole('OWNER', 'MANAGER'),
  updateUnit
);

// DELETE /api/units/:unitId - Delete unit (Owner or Manager, must own parent property)
router.delete('/units/:unitId',
  authenticateToken,
  requireRole('OWNER', 'MANAGER'),
  deleteUnit
);

export { router as propertyRoutes };
