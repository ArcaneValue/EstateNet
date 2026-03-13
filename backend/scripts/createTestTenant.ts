import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestTenant() {
    try {
        console.log('🔧 Creating test tenant account...\n');

        // Hash password
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);

        // 1. Create user
        const user = await prisma.user.upsert({
            where: { email: 'tenant.test@estatenet.com' },
            update: {},
            create: {
                email: 'tenant.test@estatenet.com',
                passwordHash: hashedPassword,
                name: 'Test Tenant',
                phoneNumber: '+256700000001',
                role: 'TENANT',
                tenantId: 'TEST123456',
            },
        });
        console.log('✅ User created:', user.email);

        // 2. Create tenant identity
        const tenantIdentity = await prisma.tenantIdentity.upsert({
            where: { tenantId: 'TEST123456' },
            update: {},
            create: {
                tenantId: 'TEST123456',
                name: 'Test Tenant',
                email: 'tenant.test@estatenet.com',
                phoneNumber: '+256700000001',
            },
        });
        console.log('✅ Tenant identity created. Tenant ID:', tenantIdentity.tenantId);

        // 3. Find or create a manager for the property
        let manager = await prisma.user.findFirst({
            where: { role: 'MANAGER' },
        });

        if (!manager) {
            console.log('⚠️  No manager found, creating one...');
            const managerPassword = await bcrypt.hash('ManagerPass123!', 10);
            manager = await prisma.user.create({
                data: {
                    email: 'manager.test@estatenet.com',
                    passwordHash: managerPassword,
                    name: 'Test Manager',
                    phoneNumber: '+256700000002',
                    role: 'MANAGER',
                },
            });
            console.log('✅ Manager created:', manager.email);
        }

        // 4. Create property (need an owner)
        let owner = await prisma.user.findFirst({
            where: { role: 'OWNER' },
        });

        if (!owner) {
            const ownerPassword = await bcrypt.hash('OwnerPass123!', 10);
            owner = await prisma.user.create({
                data: {
                    email: 'owner.test@estatenet.com',
                    passwordHash: ownerPassword,
                    name: 'Test Owner',
                    phoneNumber: '+256700000003',
                    role: 'OWNER',
                },
            });
            console.log('✅ Owner created:', owner.email);
        }

        const property = await prisma.property.upsert({
            where: { id: 'test-property-001' },
            update: {},
            create: {
                id: 'test-property-001',
                name: 'Sunrise Apartments',
                location: 'Kampala, Uganda',
                ownerId: owner.id,
                managerId: manager.id,
            },
        });
        console.log('✅ Property created:', property.name);

        // 5. Create unit
        const unit = await prisma.unit.upsert({
            where: { id: 'test-unit-001' },
            update: {},
            create: {
                id: 'test-unit-001',
                unitNumber: 'A-101',
                propertyId: property.id,
                rentAmount: 500000,
            },
        });
        console.log('✅ Unit created:', unit.unitNumber);

        // 6. Create active lease
        const lease = await prisma.lease.upsert({
            where: { id: 'test-lease-001' },
            update: {},
            create: {
                id: 'test-lease-001',
                tenantId: tenantIdentity.tenantId,
                propertyId: property.id,
                unitId: unit.id,
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-12-31'),
                rentAmount: 500000,
                status: 'ACTIVE',
            },
        });
        console.log('✅ Lease created:', lease.status);

        // 7. Create payment records
        const payments = await Promise.all([
            // January - Paid
            prisma.payment.upsert({
                where: { id: 'test-payment-jan' },
                update: {},
                create: {
                    id: 'test-payment-jan',
                    leaseId: lease.id,
                    tenantId: tenantIdentity.tenantId,
                    propertyId: property.id,
                    unitId: unit.id,
                    amount: 500000,
                    dueDate: new Date('2026-01-05'),
                    paymentDate: new Date('2026-01-03'),
                    billingPeriod: '2026-01',
                    status: 'PAID',
                    paymentMethod: 'MOBILE_MONEY',
                },
            }),
            // February - Paid
            prisma.payment.upsert({
                where: { id: 'test-payment-feb' },
                update: {},
                create: {
                    id: 'test-payment-feb',
                    leaseId: lease.id,
                    tenantId: tenantIdentity.tenantId,
                    propertyId: property.id,
                    unitId: unit.id,
                    amount: 500000,
                    dueDate: new Date('2026-02-05'),
                    paymentDate: new Date('2026-02-04'),
                    billingPeriod: '2026-02',
                    status: 'PAID',
                    paymentMethod: 'BANK_TRANSFER',
                },
            }),
            // March - Pending (current month)
            prisma.payment.upsert({
                where: { id: 'test-payment-mar' },
                update: {},
                create: {
                    id: 'test-payment-mar',
                    leaseId: lease.id,
                    tenantId: tenantIdentity.tenantId,
                    propertyId: property.id,
                    unitId: unit.id,
                    amount: 500000,
                    dueDate: new Date('2026-03-05'),
                    paymentDate: new Date('2026-03-05'),
                    billingPeriod: '2026-03',
                    status: 'PENDING',
                },
            }),
        ]);
        console.log('✅ Payments created:', payments.length);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Test Tenant Account Created Successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📧 Login Credentials:');
        console.log('   Email:    tenant.test@estatenet.com');
        console.log('   Password: TestPass123!');
        console.log('   Tenant ID: TEST123456');
        console.log('\n🏠 Account Details:');
        console.log('   Property: Sunrise Apartments');
        console.log('   Unit:     A-101 (2 bed, 1 bath)');
        console.log('   Rent:     500,000 UGX/month');
        console.log('   Lease:    Active (Jan 1 - Dec 31, 2026)');
        console.log('\n💰 Payment Status:');
        console.log('   January:  ✅ Paid (500,000 UGX)');
        console.log('   February: ✅ Paid (500,000 UGX)');
        console.log('   March:    ⏳ Pending (500,000 UGX)');
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Error creating test tenant:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

createTestTenant()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
