import express from 'express';
import { authenticateToken } from '../middlewares/auth';
import { getDashboardData, getManagerLeases, getManagerInvitations, getManagerTenants } from '../controllers/managerController';
import { requireManagerTermsAccepted, requireCurrentBilling } from '../middlewares/billingEnforcement';

const router = express.Router();

// All manager routes require authentication
router.use(authenticateToken);

// GET /api/manager/enforcement-check - Check if manager can perform gated actions
// This endpoint applies enforcement middleware and returns 402 if enforcement is needed
router.get('/enforcement-check',
    requireManagerTermsAccepted,
    requireCurrentBilling,
    (req, res) => {
        res.json({
            success: true,
            message: 'Enforcement check passed',
            canProceed: true
        });
    }
);

// GET /api/manager/dashboard - Get aggregated dashboard data
router.get('/dashboard', getDashboardData);

// GET /api/manager/leases - Get manager's leases with filters
router.get('/leases', getManagerLeases);

// GET /api/manager/invitations - Get manager's invitations with filters  
router.get('/invitations', getManagerInvitations);

// GET /api/manager/tenants - Get manager's tenants with active leases (includes leaseId for messaging)
router.get('/tenants', getManagerTenants);

export default router;
