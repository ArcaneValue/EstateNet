import { Router } from 'express';
import { setupAuthentication, login, getCurrentUser, registerManager, registerTenant } from '../controllers/authController';
import { authSetupValidation, loginValidation, managerRegisterValidation, validateRequest } from '../middlewares/validation';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Manager registration
router.post('/register/manager',
    managerRegisterValidation,
    validateRequest,
    registerManager
);

// Tenant registration
router.post('/register-tenant',
    validateRequest,
    registerTenant
);

// Setup authentication for existing tenant identity
router.post('/setup',
    authSetupValidation,
    validateRequest,
    setupAuthentication
);

// Login
router.post('/login',
    loginValidation,
    validateRequest,
    login
);

// Get current user (protected route)
router.get('/me',
    authenticateToken,
    getCurrentUser
);

export { router as authRoutes };
