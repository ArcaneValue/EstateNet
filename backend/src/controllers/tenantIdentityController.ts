import { Request, Response } from 'express';
import { TenantIdentityService } from '../services/tenantIdentityService';
import { ApiResponse } from '../middlewares/errorHandler';

const tenantIdentityService = new TenantIdentityService();

export const createTenantIdentity = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, phoneNumber } = req.body;

        const tenantIdentity = await tenantIdentityService.createTenantIdentity({
            name,
            email,
            phoneNumber
        });

        const response: ApiResponse = {
            success: true,
            message: 'Tenant identity created successfully',
            data: {
                tenantIdentity: {
                    id: tenantIdentity.id,
                    tenantId: tenantIdentity.tenantId,
                    name: tenantIdentity.name,
                    email: tenantIdentity.email,
                    phoneNumber: tenantIdentity.phoneNumber,
                    createdAt: tenantIdentity.createdAt
                }
            }
        };

        res.status(201).json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };

        if (error instanceof Error && error.message.includes('already exists')) {
            res.status(409).json(response);
        } else {
            res.status(500).json(response);
        }
    }
};

export const getTenantIdentity = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tenantId } = req.params;

        const tenantIdentity = await tenantIdentityService.getTenantIdentity(tenantId);

        const response: ApiResponse = {
            success: true,
            message: 'Tenant identity retrieved successfully',
            data: tenantIdentity
        };

        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };

        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json(response);
        } else {
            res.status(500).json(response);
        }
    }
};

export const searchTenantIdentities = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await tenantIdentityService.searchTenantIdentities(query, limit, offset);

        const response: ApiResponse = {
            success: true,
            message: 'Tenant identities search completed',
            data: result
        };

        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };

        res.status(500).json(response);
    }
};

export const getAllTenantIdentities = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await tenantIdentityService.getAllTenantIdentities(limit, offset);

        const response: ApiResponse = {
            success: true,
            message: 'All tenant identities retrieved successfully',
            data: result
        };

        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };

        res.status(500).json(response);
    }
};
