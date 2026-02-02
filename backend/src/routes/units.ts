import { Router } from 'express';
import { updateUnit, deleteUnit } from '../controllers/propertyController';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';

const router = Router();

// PATCH /api/units/:unitId - Update unit (Manager only, must own parent property)
router.patch('/:unitId',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  updateUnit
);

// DELETE /api/units/:unitId - Delete unit (Manager only, must own parent property)
router.delete('/:unitId',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  deleteUnit
);

export { router as unitRoutes };
