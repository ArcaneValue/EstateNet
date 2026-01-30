import { Response, NextFunction } from 'express';
import { UserRole } from '../types/prisma';
import { AuthenticatedRequest } from './auth';

export const requireUserRole = (role: UserRole) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        success: false,
        message: `Access denied. ${role} role required.`
      });
      return;
    }

    next();
  };
};
