import { Response, NextFunction } from 'express';
import { UserRole } from '../types/prisma';
import { AuthenticatedRequest } from './auth';

export const requireUserRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: `Access denied. ${roles.join(' or ')} role required.`
      });
      return;
    }

    next();
  };
};
