import { Router } from 'express';
import { createProperty, getAllProperties, getPropertyById } from '../controllers/propertyController';
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

// GET /api/properties - Get all properties (Manager only)
router.get('/',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getAllProperties
);

// GET /api/properties/:id - Get property by ID (Manager only)
router.get('/:id',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  getPropertyById
);

export { router as propertyRoutes };
