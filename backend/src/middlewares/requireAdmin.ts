import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.isAdmin) {
        res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
        return;
    }
    next();
};

export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.isAdmin || !req.user?.adminPermissions?.isSuperAdmin) {
        res.status(403).json({
            success: false,
            message: 'Super admin access required'
        });
        return;
    }
    next();
};

export const requirePermission = (permission: 'canManagePosts' | 'canManageUsers' | 'canViewAnalytics') => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user?.isAdmin) {
            res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
            return;
        }

        if (!req.user.adminPermissions?.[permission]) {
            res.status(403).json({
                success: false,
                message: `Permission denied: ${permission} required`
            });
            return;
        }

        next();
    };
};
