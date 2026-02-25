import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import {
    getRentCollectionData,
    getOutstandingRentData,
    getCashflowStatementData,
    getIncomeStatementData,
    getFinancialPositionData
} from '../services/managerFinanceService';

export const getRentCollection = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const managerId = req.user?.id;
        if (!managerId) {
            res.status(401).json({
                success: false,
                message: 'Manager authentication required',
            });
            return;
        }

        const { period, propertyId } = req.query;

        const data = await getRentCollectionData(
            managerId,
            typeof period === 'string' ? period : undefined,
            typeof propertyId === 'string' ? propertyId : undefined
        );

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('Error in getRentCollection controller:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error?.message || 'Unknown error'
        });
    }
};

export const getOutstandingRent = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const managerId = req.user?.id;
        if (!managerId) {
            res.status(401).json({
                success: false,
                message: 'Manager authentication required',
            });
            return;
        }

        const { period, propertyId } = req.query;

        const data = await getOutstandingRentData(
            managerId,
            typeof period === 'string' ? period : undefined,
            typeof propertyId === 'string' ? propertyId : undefined
        );

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('Error in getOutstandingRent controller:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error?.message || 'Unknown error'
        });
    }
};

export const getCashflowStatement = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const managerId = req.user?.id;
        if (!managerId) {
            res.status(401).json({
                success: false,
                message: 'Manager authentication required',
            });
            return;
        }

        const { period, propertyId } = req.query;

        const data = await getCashflowStatementData(
            managerId,
            typeof period === 'string' ? period : undefined,
            typeof propertyId === 'string' ? propertyId : undefined
        );

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('Error in getCashflowStatement controller:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error?.message || 'Unknown error'
        });
    }
};

export const getIncomeStatement = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const managerId = req.user?.id;
        if (!managerId) {
            res.status(401).json({
                success: false,
                message: 'Manager authentication required',
            });
            return;
        }

        const { period, propertyId } = req.query;

        const data = await getIncomeStatementData(
            managerId,
            typeof period === 'string' ? period : undefined,
            typeof propertyId === 'string' ? propertyId : undefined
        );

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('Error in getIncomeStatement controller:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error?.message || 'Unknown error'
        });
    }
};

export const getFinancialPosition = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const managerId = req.user?.id;
        if (!managerId) {
            res.status(401).json({
                success: false,
                message: 'Manager authentication required',
            });
            return;
        }

        const { period, propertyId } = req.query;

        const data = await getFinancialPositionData(
            managerId,
            typeof period === 'string' ? period : undefined,
            typeof propertyId === 'string' ? propertyId : undefined
        );

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('Error in getFinancialPosition controller:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error?.message || 'Unknown error'
        });
    }
};
