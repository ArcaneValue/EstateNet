import { Router } from 'express';
import {
    createTenantIdentity,
    getTenantIdentity,
    searchTenantIdentities,
    getAllTenantIdentities
} from '../controllers/tenantIdentityController';
import { tenantIdentityValidation, validateRequest } from '../middlewares/validation';

const router = Router();

// Create tenant identity
router.post('/create',
    tenantIdentityValidation,
    validateRequest,
    createTenantIdentity
);

// Get tenant identity by tenant ID
router.get('/:tenantId', getTenantIdentity);

// Search tenant identities
router.get('/search/:query', searchTenantIdentities);

// Get all tenant identities
router.get('/', getAllTenantIdentities);

export { router as identityRoutes };
