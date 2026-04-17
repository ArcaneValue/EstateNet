import { prisma } from '../utils/database';

export class AdminService {
    async createAdminEmail(email: string, permissions: {
        isSuperAdmin?: boolean;
        canManagePosts?: boolean;
        canManageUsers?: boolean;
        canViewAnalytics?: boolean;
    }) {
        const existingAdmin = await (prisma as any).adminPermission.findUnique({
            where: { email }
        });

        if (existingAdmin) {
            throw new Error('Admin email already exists');
        }

        const admin = await (prisma as any).adminPermission.create({
            data: {
                email,
                isSuperAdmin: permissions.isSuperAdmin || false,
                canManagePosts: permissions.canManagePosts !== undefined ? permissions.canManagePosts : true,
                canManageUsers: permissions.canManageUsers || false,
                canViewAnalytics: permissions.canViewAnalytics !== undefined ? permissions.canViewAnalytics : true
            }
        });

        return admin;
    }

    async updateAdminPermissions(email: string, permissions: {
        isSuperAdmin?: boolean;
        canManagePosts?: boolean;
        canManageUsers?: boolean;
        canViewAnalytics?: boolean;
    }) {
        const admin = await (prisma as any).adminPermission.update({
            where: { email },
            data: permissions
        });

        return admin;
    }

    async removeAdminEmail(email: string) {
        await (prisma as any).adminPermission.delete({
            where: { email }
        });

        return { success: true };
    }

    async listAdmins() {
        const admins = await (prisma as any).adminPermission.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        return admins;
    }

    async getAdminByEmail(email: string) {
        const admin = await (prisma as any).adminPermission.findUnique({
            where: { email }
        });

        return admin;
    }
}

export default new AdminService();
