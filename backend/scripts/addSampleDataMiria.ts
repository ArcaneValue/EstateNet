import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function addSampleDataForMiria() {
    try {
        console.log('🔧 Adding sample data for miria@gmail.com...\n');

        // 1. Find the user
        const user = await prisma.user.findUnique({
            where: { email: 'miria@gmail.com' },
        });

        if (!user) {
            console.error('❌ User miria@gmail.com not found!');
            return;
        }

        console.log('✅ Found user:', user.email);

        // 2. Check if tenant identity exists
        let tenantIdentity = await prisma.tenantIdentity.findUnique({
            where: { tenantId: user.tenantId || '' },
        });

        if (!tenantIdentity && user.tenantId) {
            tenantIdentity = await prisma.tenantIdentity.create({
                data: {
                    tenantId: user.tenantId,
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                },
            });
            console.log('✅ Tenant identity created:', tenantIdentity.tenantId);
        } else if (tenantIdentity) {
            console.log('✅ Tenant identity exists:', tenantIdentity.tenantId);
        } else {
            console.error('❌ User does not have a tenantId');
            return;
        }

        // 3. Find or create a manager
        let manager = await prisma.user.findFirst({
            where: { role: 'MANAGER' },
        });

        if (!manager) {
            const managerPassword = await bcrypt.hash('ManagerPass123!', 10);
            manager = await prisma.user.create({
                data: {
                    email: 'manager.sample@estatenet.com',
                    passwordHash: managerPassword,
                    name: 'Sample Manager',
                    phoneNumber: '+256700000002',
                    role: 'MANAGER',
                },
            });
            console.log('✅ Manager created:', manager.email);
        }

        // 4. Find or create an owner
        let owner = await prisma.user.findFirst({
            where: { role: 'OWNER' },
        });

        if (!owner) {
            const ownerPassword = await bcrypt.hash('OwnerPass123!', 10);
            owner = await prisma.user.create({
                data: {
                    email: 'owner.sample@estatenet.com',
                    passwordHash: ownerPassword,
                    name: 'Sample Owner',
                    phoneNumber: '+256700000003',
                    role: 'OWNER',
                },
            });
            console.log('✅ Owner created:', owner.email);
        }

        // 5. Create property
        const property = await prisma.property.create({
            data: {
                name: 'Kololo Heights Apartments',
                location: 'Kololo, Kampala, Uganda',
                ownerId: owner.id,
                managerId: manager.id,
            },
        });
        console.log('✅ Property created:', property.name);

        // 6. Create unit
        const unit = await prisma.unit.create({
            data: {
                unitNumber: 'B-205',
                propertyId: property.id,
                rentAmount: 800000, // 800,000 UGX monthly rent
            },
        });
        console.log('✅ Unit created:', unit.unitNumber);

        // 7. Create active lease
        const lease = await prisma.lease.create({
            data: {
                tenantId: tenantIdentity.tenantId,
                propertyId: property.id,
                unitId: unit.id,
                startDate: new Date('2025-10-01'),
                endDate: new Date('2026-09-30'),
                rentAmount: 800000,
                status: 'ACTIVE',
            },
        });
        console.log('✅ Lease created:', lease.status);

        // 8. Create payment records (last 6 months)
        const payments = [];
        const months = [
            { month: '2025-10', date: '2025-10-05', paid: '2025-10-03', status: 'PAID' },
            { month: '2025-11', date: '2025-11-05', paid: '2025-11-04', status: 'PAID' },
            { month: '2025-12', date: '2025-12-05', paid: '2025-12-02', status: 'PAID' },
            { month: '2026-01', date: '2026-01-05', paid: '2026-01-04', status: 'PAID' },
            { month: '2026-02', date: '2026-02-05', paid: '2026-02-03', status: 'PAID' },
            { month: '2026-03', date: '2026-03-05', paid: null, status: 'PENDING' },
        ];

        for (const m of months) {
            const payment = await prisma.payment.create({
                data: {
                    leaseId: lease.id,
                    tenantId: tenantIdentity.tenantId,
                    propertyId: property.id,
                    unitId: unit.id,
                    amount: 800000,
                    dueDate: new Date(m.date),
                    paymentDate: m.paid ? new Date(m.paid) : new Date(m.date),
                    billingPeriod: m.month,
                    status: m.status as any,
                    paymentMethod: m.status === 'PAID' ? 'MOBILE_MONEY' : undefined,
                },
            });
            payments.push(payment);
        }
        console.log('✅ Payments created:', payments.length);

        // 9. Create some messages
        const message1 = await prisma.message.create({
            data: {
                fromUserId: manager.id,
                toUserId: user.id,
                leaseId: lease.id,
                subject: 'Welcome to Kololo Heights',
                body: 'Welcome to Kololo Heights Apartments! We are pleased to have you as our tenant. If you have any questions or concerns, please feel free to reach out.',
                readAt: new Date(),
            },
        });

        const message2 = await prisma.message.create({
            data: {
                fromUserId: manager.id,
                toUserId: user.id,
                leaseId: lease.id,
                subject: 'Monthly Rent Reminder',
                body: 'This is a friendly reminder that your rent for March 2026 is due on the 5th. Please ensure timely payment to avoid any late fees.',
            },
        });

        console.log('✅ Messages created: 2');

        // 10. Create a notification
        const notification = await prisma.notification.create({
            data: {
                userId: user.id,
                type: 'PAYMENT_REMINDER',
                title: 'Rent Due Soon',
                body: 'Your rent payment of UGX 800,000 is due on March 5, 2026.',
                metadata: {
                    amount: 800000,
                    dueDate: '2026-03-05',
                    propertyName: property.name,
                },
            },
        });

        console.log('✅ Notification created');

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Sample Data Added Successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📧 Account: miria@gmail.com');
        console.log('🔑 Password: Ak47grave');
        console.log('\n🏠 Property Details:');
        console.log('   Property: Kololo Heights Apartments');
        console.log('   Location: Kololo, Kampala, Uganda');
        console.log('   Unit:     B-205 (2 bed, 1 bath)');
        console.log('   Rent:     800,000 UGX/month');
        console.log('   Lease:    Active (Oct 2025 - Sep 2026)');
        console.log('\n💰 Payment History:');
        console.log('   October 2025:   ✅ Paid (800,000 UGX)');
        console.log('   November 2025:  ✅ Paid (800,000 UGX)');
        console.log('   December 2025:  ✅ Paid (800,000 UGX)');
        console.log('   January 2026:   ✅ Paid (800,000 UGX)');
        console.log('   February 2026:  ✅ Paid (800,000 UGX)');
        console.log('   March 2026:     ⏳ Pending (800,000 UGX)');
        console.log('\n📬 Messages: 2 messages from property manager');
        console.log('🔔 Notifications: 1 unread notification');
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Error adding sample data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

addSampleDataForMiria()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
