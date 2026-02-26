import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';

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

        if (process.env.NODE_ENV !== 'production') {
            console.log('Token verified, user role:', decoded.role);
        }
        req.user = decoded;

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
