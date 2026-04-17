import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';
import { comparePassword, hashPassword } from '../utils/password';

export class AdminAuthController {
    async verifyAdminCredentials(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
                return;
            }

            // Check if email exists in AdminPermission table
            const adminPermission = await (prisma as any).adminPermission.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (!adminPermission) {
                res.status(403).json({
                    success: false,
                    message: 'Invalid admin credentials'
                });
                return;
            }

            // Find the user account with this email
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (!user) {
                res.status(403).json({
                    success: false,
                    message: 'Invalid admin credentials'
                });
                return;
            }

            // Verify password
            const isValidPassword = await comparePassword(password, user.passwordHash);
            if (!isValidPassword) {
                res.status(403).json({
                    success: false,
                    message: 'Invalid admin credentials'
                });
                return;
            }

            // Admin credentials verified successfully
            res.json({
                success: true,
                message: 'Admin access granted',
                adminPermissions: {
                    isSuperAdmin: adminPermission.isSuperAdmin,
                    canManagePosts: adminPermission.canManagePosts,
                    canManageUsers: adminPermission.canManageUsers,
                    canViewAnalytics: adminPermission.canViewAnalytics
                }
            });
        } catch (error) {
            console.error('Admin verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify admin credentials'
            });
        }
    }

    async createAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { email, password, isSuperAdmin, canManagePosts, canManageUsers, canViewAnalytics } = req.body;

            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
                return;
            }

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            let userId: string;

            if (existingUser) {
                userId = existingUser.id;
            } else {
                // Create new user account
                const hashedPassword = await hashPassword(password);
                const newUser = await prisma.user.create({
                    data: {
                        email: email.toLowerCase(),
                        name: email.split('@')[0],
                        passwordHash: hashedPassword,
                        role: 'OWNER' // Default role
                    }
                });
                userId = newUser.id;
            }

            // Check if admin permissions already exist
            const existingPermission = await (prisma as any).adminPermission.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (existingPermission) {
                res.status(400).json({
                    success: false,
                    message: 'Admin permissions already exist for this email'
                });
                return;
            }

            // Create admin permissions
            const adminPermission = await (prisma as any).adminPermission.create({
                data: {
                    email: email.toLowerCase(),
                    isSuperAdmin: isSuperAdmin || false,
                    canManagePosts: canManagePosts !== undefined ? canManagePosts : true,
                    canManageUsers: canManageUsers !== undefined ? canManageUsers : false,
                    canViewAnalytics: canViewAnalytics !== undefined ? canViewAnalytics : true
                }
            });

            res.json({
                success: true,
                message: 'Admin created successfully',
                data: {
                    email: adminPermission.email,
                    permissions: {
                        isSuperAdmin: adminPermission.isSuperAdmin,
                        canManagePosts: adminPermission.canManagePosts,
                        canManageUsers: adminPermission.canManageUsers,
                        canViewAnalytics: adminPermission.canViewAnalytics
                    }
                }
            });
        } catch (error) {
            console.error('Create admin error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create admin'
            });
        }
    }
}
