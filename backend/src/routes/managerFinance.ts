import express from 'express';
import { authenticateToken } from '../middlewares/auth';
import { requireUserRole } from '../middlewares/requireUserRole';
import { UserRole } from '../types/prisma';
import {
    getRentCollection,
    getOutstandingRent,
    getCashflowStatement,
    getIncomeStatement,
    getFinancialPosition
} from '../controllers/managerFinanceController';
import {
    requireManagerTermsAccepted,
    requireCurrentBilling
} from '../middlewares/billingEnforcement';

const router = express.Router();

// All routes require manager authentication
router.use(authenticateToken);
router.use(requireUserRole(UserRole.MANAGER));
router.use(requireManagerTermsAccepted);
router.use(requireCurrentBilling);

// GET /api/manager/finance/rent-collection - Get rent collection data with period filtering
router.get('/rent-collection', getRentCollection);

// GET /api/manager/finance/outstanding-rent - Get outstanding rent data with period filtering
router.get('/outstanding-rent', getOutstandingRent);

// GET /api/manager/finance/cashflow - Get cashflow statement data with period filtering
router.get('/cashflow', getCashflowStatement);

// GET /api/manager/finance/income-statement - Get income statement data with period filtering
router.get('/income-statement', getIncomeStatement);

// GET /api/manager/finance/financial-position - Get financial position data with period filtering
router.get('/financial-position', getFinancialPosition);

export { router as managerFinanceRoutes };
