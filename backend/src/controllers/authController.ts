import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { ApiResponse } from '../middlewares/errorHandler';

const authService = new AuthService();

export const setupAuthentication = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tenantId, email, password, name } = req.body;

        const result = await authService.setupAuthentication({
            tenantId,
            email,
            password,
            name
        });

        const response: ApiResponse = {
            success: true,
            message: 'Authentication setup successful',
            data: result
        };

        res.status(201).json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };

        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json(response);
        } else if (error instanceof Error && error.message.includes('already set up')) {
            res.status(409).json(response);
        } else {
            res.status(500).json(response);
        }
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const result = await authService.login(email, password);

        const response: ApiResponse = {
            success: true,
            message: 'Login successful',
            data: result
        };

        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };

        if (error instanceof Error && error.message.includes('Invalid credentials')) {
            res.status(401).json(response);
        } else {
            res.status(500).json(response);
        }
    }
};

export const registerManager = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, phoneNumber, password } = req.body;

        const result = await authService.registerManager({
            name,
            email,
            phoneNumber,
            password
        });

        const response: ApiResponse = {
            success: true,
            message: 'Manager registration successful',
            data: result
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

export const registerTenant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, phoneNumber, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            const response: ApiResponse = {
                success: false,
                message: 'Name, email, and password are required'
            };
            res.status(400).json(response);
            return;
        }

        const result = await authService.registerTenant({
            name,
            email,
            phoneNumber,
            password
        });

        const response: ApiResponse = {
            success: true,
            message: 'Tenant registered successfully',
            data: result
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

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            const response: ApiResponse = {
                success: false,
                message: 'User not authenticated'
            };
            res.status(401).json(response);
            return;
        }

        const result = await authService.getCurrentUser(req.user.id);

        const response: ApiResponse = {
            success: true,
            message: 'User retrieved successfully',
            data: result
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
