import { Router } from 'express';
import { setupAuthentication, login, getCurrentUser, registerManager, registerTenant, registerOwner, deleteAccount } from '../controllers/authController';
import { AdminAuthController } from '../controllers/adminAuthController';
import { body, validationResult } from 'express-validator';
import { authSetupValidation, loginValidation, managerRegisterValidation, tenantIdentityValidation, validateRequest } from '../middlewares/validation';
import { authenticateToken } from '../middlewares/auth';

const adminAuthController = new AdminAuthController();

const router = Router();

// Owner registration
router.post('/register-owner',
    managerRegisterValidation,
    validateRequest,
    registerOwner
);

// Manager registration
router.post('/register/manager',
    managerRegisterValidation,
    validateRequest,
    registerManager
);

// Tenant registration
router.post('/register-tenant',
    [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),

        body('email')
            .trim()
            .isEmail()
            .withMessage('Valid email is required')
            .normalizeEmail(),

        body('phoneNumber')
            .trim()
            .notEmpty()
            .withMessage('Phone number is required')
            .isLength({ min: 10, max: 20 })
            .withMessage('Phone number must be between 10 and 20 characters'),

        body('password')
            .notEmpty()
            .withMessage('Password is required')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters')
    ],
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

// Delete account (protected route)
router.delete('/account',
    authenticateToken,
    deleteAccount
);

// Get current user (protected route)
router.get('/me',
    authenticateToken,
    getCurrentUser
);

// Admin verification endpoint
router.post('/admin-verify',
    authenticateToken,
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validateRequest,
    adminAuthController.verifyAdminCredentials.bind(adminAuthController)
);

export { router as authRoutes };
