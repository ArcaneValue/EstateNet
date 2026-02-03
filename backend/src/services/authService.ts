import { prisma } from '../utils/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

export class AuthService {
    async setupAuthentication(data: {
        tenantId: string;
        email: string;
        password: string;
        name?: string;
    }) {
        // Find tenant identity
        const tenantIdentity = await prisma.tenantIdentity.findUnique({
            where: { tenantId: data.tenantId }
        });

        if (!tenantIdentity) {
            throw new Error('Tenant identity not found');
        }

        // Verify email matches identity
        if (tenantIdentity.email !== data.email) {
            throw new Error('Email does not match tenant identity');
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            throw new Error('Authentication already set up for this tenant');
        }

        // Hash password
        const passwordHash = await hashPassword(data.password);

        // Create user account linked to tenant identity
        const user = await prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                name: data.name || tenantIdentity.name,
                role: 'TENANT',
                tenantId: data.tenantId,
            },
            include: {
                tenantIdentity: true
            }
        });

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                phoneNumber: user.phoneNumber,
                profileImage: user.profileImage,
                notificationPrefs: (user as any).notificationPrefs,
            },
            tenantIdentity: user.tenantIdentity,
            token
        };
    }

    async login(email: string, password: string) {
        // Find user with tenant identity
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                tenantIdentity: true
            }
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.passwordHash);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        // Generate token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId || undefined
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                phoneNumber: user.phoneNumber
            },
            tenantIdentity: user.tenantIdentity,
            token
        };
    }

    async registerManager(data: {
        name: string;
        email: string;
        phoneNumber: string;
        password: string;
    }) {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const passwordHash = await hashPassword(data.password);

        // Create manager user
        const user = await prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                name: data.name,
                phoneNumber: data.phoneNumber,
                role: 'MANAGER',
                tenantId: null,
            }
        });

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                phoneNumber: user.phoneNumber,
                profileImage: user.profileImage,
                notificationPrefs: (user as any).notificationPrefs,
            },
            token
        };
    }

    async registerTenant(data: {
        name: string;
        email: string;
        phoneNumber?: string;
        password: string;
    }) {
        // Check if email already exists in User OR TenantIdentity
        const [existingUser, existingTenantIdentity] = await Promise.all([
            prisma.user.findUnique({ where: { email: data.email } }),
            prisma.tenantIdentity.findUnique({ where: { email: data.email } })
        ]);

        if (existingUser || existingTenantIdentity) {
            throw new Error('Email already exists');
        }

        // Generate tenant ID
        const tenantId = 'TN-' + Math.random().toString(36).substring(2, 10).toUpperCase();

        // Create TenantIdentity first
        const tenantIdentity = await prisma.tenantIdentity.create({
            data: {
                tenantId,
                name: data.name,
                email: data.email,
                phoneNumber: data.phoneNumber
            }
        });

        // Hash password
        const passwordHash = await hashPassword(data.password);

        // Create User
        const user = await prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                name: data.name,
                role: 'TENANT',
                tenantId,
            }
        });

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId || undefined
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                phoneNumber: user.phoneNumber,
                profileImage: user.profileImage
            },
            token
        };
    }

    async registerOwner(data: {
        name: string;
        email: string;
        phoneNumber: string;
        password: string;
    }) {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const passwordHash = await hashPassword(data.password);

        // Create owner user
        const user = await prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                name: data.name,
                phoneNumber: data.phoneNumber,
                role: 'OWNER',
                tenantId: null,
            }
        });

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                phoneNumber: user.phoneNumber,
                profileImage: user.profileImage,
                notificationPrefs: (user as any).notificationPrefs,
            },
            token
        };
    }

    async getCurrentUser(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                tenantIdentity: true
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                phoneNumber: user.phoneNumber,
                profileImage: user.profileImage,
                notificationPrefs: (user as any).notificationPrefs,
            },
            tenantIdentity: user.tenantIdentity
        };
    }
}
