import { Response, NextFunction } from 'express';
import { UserRole } from '../types/prisma';
import { AuthenticatedRequest } from './auth';

export const requireUserRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    console.log('=== ROLE MIDDLEWARE START ===');
    console.log('Required roles:', roles);
    console.log('User role:', req.user?.role);

    if (!req.user) {
      console.log('No user found in request');
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      console.log('Role check failed');
      res.status(403).json({
        success: false,
        message: `Access denied. ${roles.join(' or ')} role required.`
      });
      return;
    }

    console.log('=== ROLE MIDDLEWARE SUCCESS ===');
    next();
  };
};
