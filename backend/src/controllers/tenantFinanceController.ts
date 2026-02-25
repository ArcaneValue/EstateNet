import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { getTenantRentStatus } from '../services/tenantFinanceService';

export const getTenantRentStatusHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (req.user?.role !== 'TENANT') {
            res.status(403).json({
                success: false,
                message: 'Access denied. Tenant role required.'
            });
            return;
        }

        if (!req.user.tenantId) {
            res.status(400).json({
                success: false,
                message: 'Tenant ID not found in user profile'
            });
            return;
        }

        const { period } = req.query;
        const periodParam = typeof period === 'string' ? period : undefined;

        const rentStatus = await getTenantRentStatus(req.user.tenantId, periodParam);

        res.status(200).json({
            success: true,
            data: rentStatus
        });

    } catch (error) {
        console.error('Get tenant rent status error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};
