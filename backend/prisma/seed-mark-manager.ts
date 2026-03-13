import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateUniqueTenantId } from '../src/utils/tenantId';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed for mark@gmail.com manager account...');

    // Find the manager user
    const manager = await prisma.user.findUnique({
        where: { email: 'mark@gmail.com' }
    });

    if (!manager) {
        console.error('❌ Manager account mark@gmail.com not found!');
        console.log('Please create the account first by registering in the app.');
        process.exit(1);
    }

    console.log(`✅ Found manager: ${manager.name} (${manager.email})`);

    // Create sample properties with units
    const properties = [
        {
            name: 'Skyline Apartments',
            location: 'Kampala, Kololo',
            units: [
                { unitNumber: 'A101', rentAmount: 1500000 },
                { unitNumber: 'A102', rentAmount: 1500000 },
                { unitNumber: 'A103', rentAmount: 1800000 },
                { unitNumber: 'B201', rentAmount: 1600000 },
                { unitNumber: 'B202', rentAmount: 1600000 },
            ]
        },
        {
            name: 'Garden View Residences',
            location: 'Kampala, Nakasero',
            units: [
                { unitNumber: '101', rentAmount: 2000000 },
                { unitNumber: '102', rentAmount: 2000000 },
                { unitNumber: '201', rentAmount: 2200000 },
                { unitNumber: '202', rentAmount: 2200000 },
            ]
        },
        {
            name: 'Lakeview Towers',
            location: 'Entebbe Road',
            units: [
                { unitNumber: 'T1-01', rentAmount: 1200000 },
                { unitNumber: 'T1-02', rentAmount: 1200000 },
                { unitNumber: 'T2-01', rentAmount: 1400000 },
            ]
        }
    ];

    const createdProperties = [];
    for (const propData of properties) {
        let property = await prisma.property.findFirst({
            where: {
                name: propData.name,
                managerId: manager.id
            },
            include: { units: true }
        });

        if (!property) {
            property = await prisma.property.create({
                data: {
                    name: propData.name,
                    location: propData.location,
                    ownerId: manager.id, // Manager is also the owner for this seed data
                    managerId: manager.id,
                    units: {
                        create: propData.units
                    }
                },
                include: { units: true }
            });
            console.log(`✅ Created property: ${property.name} with ${property.units.length} units`);
        } else {
            console.log(`ℹ️  Property already exists: ${property.name}`);
        }
        if (property) {
            createdProperties.push(property);
        }
    }

    // Create sample tenant identities and leases
    const tenants = [
        { name: 'John Kamau', email: 'john.kamau@example.com', phone: '+256700111001' },
        { name: 'Sarah Nakato', email: 'sarah.nakato@example.com', phone: '+256700111002' },
        { name: 'David Okello', email: 'david.okello@example.com', phone: '+256700111003' },
        { name: 'Grace Nambi', email: 'grace.nambi@example.com', phone: '+256700111004' },
        { name: 'Peter Ssemakula', email: 'peter.ssemakula@example.com', phone: '+256700111005' },
        { name: 'Mary Achieng', email: 'mary.achieng@example.com', phone: '+256700111006' },
        { name: 'James Mutua', email: 'james.mutua@example.com', phone: '+256700111007' },
        { name: 'Rebecca Namusoke', email: 'rebecca.namusoke@example.com', phone: '+256700111008' },
    ];

    const createdTenants = [];
    for (const tenantData of tenants) {
        let tenantIdentity = await prisma.tenantIdentity.findFirst({
            where: { email: tenantData.email }
        });

        if (!tenantIdentity) {
            const tenantId = await generateUniqueTenantId();
            tenantIdentity = await prisma.tenantIdentity.create({
                data: {
                    tenantId,
                    name: tenantData.name,
                    email: tenantData.email,
                    phoneNumber: tenantData.phone
                }
            });
            console.log(`✅ Created tenant identity: ${tenantIdentity.name} (${tenantIdentity.tenantId})`);
        } else {
            console.log(`ℹ️  Tenant identity already exists: ${tenantIdentity.name}`);
        }
        createdTenants.push(tenantIdentity);
    }

    // Create leases for tenants (occupy some units, leave some vacant)
    const leaseAssignments = [
        { propertyIndex: 0, unitIndex: 0, tenantIndex: 0 }, // Skyline A101 -> John
        { propertyIndex: 0, unitIndex: 1, tenantIndex: 1 }, // Skyline A102 -> Sarah
        { propertyIndex: 0, unitIndex: 2, tenantIndex: 2 }, // Skyline A103 -> David
        { propertyIndex: 0, unitIndex: 3, tenantIndex: 3 }, // Skyline B201 -> Grace
        // Skyline B202 - VACANT
        { propertyIndex: 1, unitIndex: 0, tenantIndex: 4 }, // Garden 101 -> Peter
        { propertyIndex: 1, unitIndex: 1, tenantIndex: 5 }, // Garden 102 -> Mary
        { propertyIndex: 1, unitIndex: 2, tenantIndex: 6 }, // Garden 201 -> James
        // Garden 202 - VACANT
        { propertyIndex: 2, unitIndex: 0, tenantIndex: 7 }, // Lakeview T1-01 -> Rebecca
        // Lakeview T1-02 - VACANT
        // Lakeview T2-01 - VACANT
    ];

    for (const assignment of leaseAssignments) {
        const property = createdProperties[assignment.propertyIndex];
        const unit = property.units[assignment.unitIndex];
        const tenant = createdTenants[assignment.tenantIndex];

        const existingLease = await prisma.lease.findFirst({
            where: {
                tenantId: tenant.tenantId,
                propertyId: property.id,
                unitId: unit.id
            }
        });

        if (!existingLease) {
            await prisma.lease.create({
                data: {
                    tenantId: tenant.tenantId,
                    propertyId: property.id,
                    unitId: unit.id,
                    startDate: new Date('2026-01-01'),
                    endDate: new Date('2026-12-31'),
                    rentAmount: unit.rentAmount,
                    status: 'ACTIVE'
                }
            });
            console.log(`✅ Created lease: ${property.name} ${unit.unitNumber} -> ${tenant.name}`);
        } else {
            console.log(`ℹ️  Lease already exists: ${property.name} ${unit.unitNumber} -> ${tenant.name}`);
        }
    }

    // Create some sample payments (some paid, some overdue)
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const payments = [
        // Current month - some paid
        { tenantIndex: 0, amount: 1500000, date: new Date(now.getFullYear(), now.getMonth(), 5), status: 'PAID' as const },
        { tenantIndex: 1, amount: 1500000, date: new Date(now.getFullYear(), now.getMonth(), 3), status: 'PAID' as const },
        { tenantIndex: 4, amount: 2000000, date: new Date(now.getFullYear(), now.getMonth(), 7), status: 'PAID' as const },
        { tenantIndex: 5, amount: 2000000, date: new Date(now.getFullYear(), now.getMonth(), 6), status: 'PAID' as const },

        // Last month - all paid
        { tenantIndex: 0, amount: 1500000, date: new Date(now.getFullYear(), now.getMonth() - 1, 5), status: 'PAID' as const },
        { tenantIndex: 1, amount: 1500000, date: new Date(now.getFullYear(), now.getMonth() - 1, 3), status: 'PAID' as const },
        { tenantIndex: 2, amount: 1800000, date: new Date(now.getFullYear(), now.getMonth() - 1, 8), status: 'PAID' as const },
        { tenantIndex: 3, amount: 1600000, date: new Date(now.getFullYear(), now.getMonth() - 1, 10), status: 'PAID' as const },
        { tenantIndex: 4, amount: 2000000, date: new Date(now.getFullYear(), now.getMonth() - 1, 4), status: 'PAID' as const },
        { tenantIndex: 5, amount: 2000000, date: new Date(now.getFullYear(), now.getMonth() - 1, 6), status: 'PAID' as const },
        { tenantIndex: 6, amount: 2200000, date: new Date(now.getFullYear(), now.getMonth() - 1, 7), status: 'PAID' as const },
        { tenantIndex: 7, amount: 1200000, date: new Date(now.getFullYear(), now.getMonth() - 1, 9), status: 'PAID' as const },
    ];

    for (const paymentData of payments) {
        const tenant = createdTenants[paymentData.tenantIndex];
        const lease = await prisma.lease.findFirst({
            where: { tenantId: tenant.tenantId, status: 'ACTIVE' },
            include: { property: true, unit: true }
        });

        if (lease) {
            const existingPayment = await prisma.payment.findFirst({
                where: {
                    tenantId: tenant.tenantId,
                    propertyId: lease.propertyId,
                    unitId: lease.unitId,
                    amount: paymentData.amount,
                    paymentDate: paymentData.date
                }
            });

            if (!existingPayment) {
                const billingPeriod = `${paymentData.date.getFullYear()}-${String(paymentData.date.getMonth() + 1).padStart(2, '0')}`;
                const dueDate = new Date(paymentData.date.getFullYear(), paymentData.date.getMonth(), 1);

                await prisma.payment.create({
                    data: {
                        tenantId: tenant.tenantId,
                        propertyId: lease.propertyId,
                        unitId: lease.unitId,
                        leaseId: lease.id,
                        amount: paymentData.amount,
                        paymentDate: paymentData.date,
                        dueDate: dueDate,
                        billingPeriod: billingPeriod,
                        paymentMethod: 'estatenet',
                        status: paymentData.status
                    }
                });
                console.log(`✅ Created payment: ${tenant.name} - UGX ${paymentData.amount.toLocaleString()} on ${paymentData.date.toDateString()}`);
            }
        }
    }

    console.log('\n🎉 Sample data seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  Properties: ${createdProperties.length}`);
    console.log(`  Total Units: ${createdProperties.reduce((sum, p) => sum + p.units.length, 0)}`);
    console.log(`  Occupied Units: ${leaseAssignments.length}`);
    console.log(`  Vacant Units: ${createdProperties.reduce((sum, p) => sum + p.units.length, 0) - leaseAssignments.length}`);
    console.log(`  Tenants: ${createdTenants.length}`);
    console.log(`  Payments: ${payments.length}`);
    console.log('\n💰 Outstanding Rent:');
    console.log('  - David Okello (Skyline A103): UGX 1,800,000 (current month)');
    console.log('  - Grace Nambi (Skyline B201): UGX 1,600,000 (current month)');
    console.log('  - James Mutua (Garden 201): UGX 2,200,000 (current month)');
    console.log('  - Rebecca Namusoke (Lakeview T1-01): UGX 1,200,000 (current month)');
    console.log('\n✅ Manager Dashboard should now show:');
    console.log('  - 3 Properties');
    console.log('  - 12 Total Units');
    console.log('  - 8 Occupied Units (66.7% occupancy)');
    console.log('  - 4 Vacant Units');
    console.log('  - UGX 6,800,000 Outstanding Rent');
    console.log('  - UGX 8,700,000 Rent Collected (this month)');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
