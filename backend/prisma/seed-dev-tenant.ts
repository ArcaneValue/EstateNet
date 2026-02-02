import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting dev tenant seed...');

    const email = 'tenant@test.com';
    const password = 'Test123!';
    const tenantId = 'DEV-TENANT-001';
    const name = 'Dev Tenant';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log(`User ${email} already exists, skipping creation`);
    } else {
        // Create tenant identity first
        const existingIdentity = await prisma.tenantIdentity.findUnique({
            where: { tenantId }
        });

        let tenantIdentity;
        if (!existingIdentity) {
            tenantIdentity = await prisma.tenantIdentity.create({
                data: {
                    tenantId,
                    name,
                    email,
                    phoneNumber: null
                }
            });
            console.log(`Created TenantIdentity: ${tenantIdentity.tenantId}`);
        } else {
            tenantIdentity = existingIdentity;
            console.log(`TenantIdentity ${tenantId} already exists`);
        }

        // Create user with hashed password
        const hashedPassword = await hashPassword(password);
        
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name,
                role: 'TENANT',
                tenantId,
                phoneNumber: null
            }
        });

        console.log(`Created User: ${user.email} (${user.role})`);
        console.log(`Tenant ID: ${user.tenantId}`);
    }

    console.log('\nSeed complete!');
    console.log(`Login credentials: ${email} / ${password}`);
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
