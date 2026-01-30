import { prisma } from '../utils/database';
import { generateUniqueTenantId } from '../utils/tenantId';

export class TenantIdentityService {
    async createTenantIdentity(data: {
        name: string;
        email: string;
        phoneNumber?: string;
    }) {
        // Check if identity already exists
        const existingIdentity = await prisma.tenantIdentity.findUnique({
            where: { email: data.email }
        });

        if (existingIdentity) {
            throw new Error('Tenant identity with this email already exists');
        }

        // Generate unique tenant ID
        const tenantId = await generateUniqueTenantId(parseInt(process.env.TENANT_ID_LENGTH || '10'));

        // Create tenant identity
        const tenantIdentity = await prisma.tenantIdentity.create({
            data: {
                tenantId,
                name: data.name,
                email: data.email,
                phoneNumber: data.phoneNumber,
            }
        });

        return tenantIdentity;
    }

    async getTenantIdentity(tenantId: string) {
        const tenantIdentity = await prisma.tenantIdentity.findUnique({
            where: { tenantId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!tenantIdentity) {
            throw new Error('Tenant identity not found');
        }

        return tenantIdentity;
    }

    async searchTenantIdentities(query: string, limit: number = 10, offset: number = 0) {
        const identities = await prisma.tenantIdentity.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { tenantId: { contains: query, mode: 'insensitive' } }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        createdAt: true
                    }
                }
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }
        });

        const total = await prisma.tenantIdentity.count({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { tenantId: { contains: query, mode: 'insensitive' } }
                ]
            }
        });

        return {
            identities,
            pagination: {
                total,
                limit,
                offset,
                hasMore: (offset + limit) < total
            }
        };
    }

    async getAllTenantIdentities(limit: number = 20, offset: number = 0) {
        const identities = await prisma.tenantIdentity.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        createdAt: true
                    }
                }
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }
        });

        const total = await prisma.tenantIdentity.count();

        return {
            identities,
            pagination: {
                total,
                limit,
                offset,
                hasMore: (offset + limit) < total
            }
        };
    }
}
