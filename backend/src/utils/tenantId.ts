import { prisma } from '../utils/database';

export const generateTenantId = (length: number = 10): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
};

export const isTenantIdUnique = async (tenantId: string): Promise<boolean> => {
    const existing = await prisma.tenantIdentity.findUnique({
        where: { tenantId }
    });
    return !existing;
};

export const generateUniqueTenantId = async (length: number = 10): Promise<string> => {
    let tenantId: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
        tenantId = generateTenantId(length);
        attempts++;

        if (attempts > maxAttempts) {
            throw new Error('Failed to generate unique tenant ID after maximum attempts');
        }
    } while (!(await isTenantIdUnique(tenantId)));

    return tenantId;
};
