import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateUniqueTenantId } from '../src/utils/tenantId';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    const managerPassword = await bcrypt.hash('password123', 10);

    // Create or find Manager A
    let managerA = await prisma.user.findFirst({ where: { email: 'manager_a@test.com' } });
    if (!managerA) {
        managerA = await prisma.user.create({
            data: {
                email: 'manager_a@test.com',
                passwordHash: managerPassword,
                name: 'Manager A',
                role: UserRole.MANAGER,
                phoneNumber: '+256700111111'
            }
        });
        console.log(`✅ Created manager A: ${managerA.name}`);
    } else {
        console.log(`ℹ️ Manager A already exists: ${managerA.name}`);
    }

    // Create or find Manager B
    let managerB = await prisma.user.findFirst({ where: { email: 'manager_b@test.com' } });
    if (!managerB) {
        managerB = await prisma.user.create({
            data: {
                email: 'manager_b@test.com',
                passwordHash: managerPassword,
                name: 'Manager B',
                role: UserRole.MANAGER,
                phoneNumber: '+256700111112'
            }
        });
        console.log(`✅ Created manager B: ${managerB.name}`);
    } else {
        console.log(`ℹ️ Manager B already exists: ${managerB.name}`);
    }

    // Create or find tenant user
    const tenantPassword = await bcrypt.hash('password123', 10);
    let tenantUser = await prisma.user.findFirst({ where: { email: 'tenant2@test.com' } });
    if (!tenantUser) {
        tenantUser = await prisma.user.create({
            data: {
                email: 'tenant2@test.com',
                passwordHash: tenantPassword,
                name: 'Test Tenant',
                role: UserRole.TENANT,
                phoneNumber: '+256700222222'
            }
        });
        console.log(`✅ Created tenant user: ${tenantUser.name}`);
    } else {
        console.log(`ℹ️ Tenant user already exists: ${tenantUser.name}`);
    }

    // Create or find tenant identity for the tenant user
    let tenantIdentity = await prisma.tenantIdentity.findFirst({ where: { email: tenantUser.email } });
    if (!tenantIdentity) {
        const tenantId = await generateUniqueTenantId();
        tenantIdentity = await prisma.tenantIdentity.create({
            data: {
                tenantId,
                name: tenantUser.name,
                email: tenantUser.email,
                phoneNumber: tenantUser.phoneNumber
            }
        });
        console.log(`✅ Created tenant identity: ${tenantIdentity.name}`);
    } else {
        console.log(`ℹ️ Tenant identity already exists: ${tenantIdentity.name}`);
    }

    // Link tenant user to tenant identity
    await prisma.user.update({
        where: { id: tenantUser.id },
        data: { tenantId: tenantIdentity.tenantId }
    });
    console.log(`✅ Linked user to tenant identity`);

    // Create a property for manager A (only if doesn't exist)
    let property = await prisma.property.findFirst({
        where: { name: 'Sunrise Apartments' },
        include: { units: true }
    });
    if (!property) {
        property = await prisma.property.create({
            data: {
                name: 'Sunrise Apartments',
                location: 'Kampala, Nakasero',
                managerId: managerA.id,
                units: {
                    create: [
                        { unitNumber: '101', rentAmount: 1200000 },
                        { unitNumber: '102', rentAmount: 1400000 }
                    ]
                }
            },
            include: { units: true }
        });
        console.log(`✅ Created property: ${property.name} with ${property.units.length} units`);
    } else {
        console.log(`ℹ️ Property already exists: ${property.name}`);
    }

    // Create a lease for the tenant (only if doesn't exist)
    const unit101 = property.units.find((u: any) => u.unitNumber === '101');
    if (unit101) {
        const existingLease = await prisma.lease.findFirst({
            where: { tenantId: tenantIdentity.tenantId, propertyId: property.id }
        });
        if (!existingLease) {
            const lease = await prisma.lease.create({
                data: {
                    tenantId: tenantIdentity.tenantId,
                    propertyId: property.id,
                    unitId: unit101.id,
                    startDate: new Date('2026-01-01'),
                    endDate: new Date('2026-12-31'),
                    rentAmount: unit101.rentAmount,
                    status: 'ACTIVE'
                }
            });
            console.log(`✅ Created lease for unit ${unit101.unitNumber}`);
        } else {
            console.log(`ℹ️ Lease already exists for tenant on unit ${unit101.unitNumber}`);
        }
    }

    console.log('\n🎉 Database seed completed successfully!');
    console.log('\nTest Credentials:');
    console.log('  Manager A: manager_a@test.com / password123');
    console.log('  Manager B: manager_b@test.com / password123');
    console.log('  Tenant:    tenant2@test.com / password123');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
