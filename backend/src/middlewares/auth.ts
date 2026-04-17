import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { prisma } from '../utils/database';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        tenantId?: string;
        phoneNumber?: string;
        // Manager billing fields
        managerTermsAcceptedAt?: Date | null;
        billingStatus?: string | null;
        billingGraceUntil?: Date | null;
        // Manager org linkage
        createdByOwnerId?: string | null;
        // Admin fields
        isAdmin?: boolean;
        adminPermissions?: {
            isSuperAdmin?: boolean;
            canManagePosts?: boolean;
            canManageUsers?: boolean;
            canViewAnalytics?: boolean;
        };
    };
}

export const authenticateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('=== AUTH MIDDLEWARE START ===');
        console.log('Path:', req.path);
        console.log('Method:', req.method);
        console.log('Authorization header exists:', !!req.headers.authorization);
    }

    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (process.env.NODE_ENV !== 'production') {
            console.log('Token extracted:', !!token);
        }

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token required'
            });
            return;
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log('Verifying token...');
        }
        const decoded = verifyToken(token);

        // Convert date strings back to Date objects for the user object
        const userWithDates = {
            ...decoded,
            managerTermsAcceptedAt: decoded.managerTermsAcceptedAt ? new Date(decoded.managerTermsAcceptedAt) : null,
            billingGraceUntil: decoded.billingGraceUntil ? new Date(decoded.billingGraceUntil) : null,
        };

        if (process.env.NODE_ENV !== 'production') {
            console.log('Token verified, user role:', decoded.role);
        }

        // Check if user has admin permissions
        try {
            const adminPermission = await (prisma as any).adminPermission.findUnique({
                where: { email: decoded.email.toLowerCase() }
            });

            if (adminPermission) {
                userWithDates.isAdmin = true;
                userWithDates.adminPermissions = {
                    isSuperAdmin: adminPermission.isSuperAdmin,
                    canManagePosts: adminPermission.canManagePosts,
                    canManageUsers: adminPermission.canManageUsers,
                    canViewAnalytics: adminPermission.canViewAnalytics
                };

                if (process.env.NODE_ENV !== 'production') {
                    console.log('Admin permissions loaded for user:', decoded.email);
                }
            } else {
                userWithDates.isAdmin = false;
                userWithDates.adminPermissions = undefined;
            }
        } catch (error) {
            console.error('Error checking admin permissions:', error);
            userWithDates.isAdmin = false;
            userWithDates.adminPermissions = undefined;
        }

        req.user = userWithDates;

        if (process.env.NODE_ENV !== 'production') {
            console.log('=== AUTH MIDDLEWARE SUCCESS ===');
        }
        next();
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Auth middleware error:', error);
        }
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
            return;
        }

        next();
    };
};
