import express from 'express';
import { authenticateToken } from '../middlewares/auth';
import { getDashboardData, getManagerLeases, getManagerInvitations } from '../controllers/managerController';

const router = express.Router();

// All manager routes require authentication
router.use(authenticateToken);

// GET /api/manager/dashboard - Get aggregated dashboard data
router.get('/dashboard', getDashboardData);

// GET /api/manager/leases - Get manager's leases with filters
router.get('/leases', getManagerLeases);

// GET /api/manager/invitations - Get manager's invitations with filters  
router.get('/invitations', getManagerInvitations);

export default router;
