import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Dev account credentials
const DEV_ACCOUNTS = {
  owner: {
    email: 'owner@dev.com',
    password: 'DevOwner123!',
    name: 'Dev Owner',
    phoneNumber: '+256700000001'
  },
  manager: {
    email: 'manager@dev.com',
    password: 'DevManager123!',
    name: 'Dev Manager',
    phoneNumber: '+256700000002'
  },
  tenant: {
    email: 'tenant@dev.com',
    password: 'DevTenant123!',
    name: 'Dev Tenant',
    phoneNumber: '+256700000003',
    tenantId: 'DEV-TENANT-001'
  }
};

async function cleanupDatabase() {
  console.log('🧹 Cleaning up existing database...');

  // Delete in order to respect foreign key constraints
  await prisma.servicePayment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.jobLock.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.tenantInvitation.deleteMany();
  await prisma.ownerManagerInvitation.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.tenantIdentity.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleaned up successfully');
}

async function createDevAccounts() {
  console.log('👤 Creating dev accounts...');

  // Create tenant identity first
  const tenantIdentity = await prisma.tenantIdentity.create({
    data: {
      tenantId: DEV_ACCOUNTS.tenant.tenantId,
      name: DEV_ACCOUNTS.tenant.name,
      email: DEV_ACCOUNTS.tenant.email,
      phoneNumber: DEV_ACCOUNTS.tenant.phoneNumber
    }
  });

  console.log('✅ Created tenant identity:', tenantIdentity.tenantId);

  // Create users
  const ownerPasswordHash = await bcrypt.hash(DEV_ACCOUNTS.owner.password, 10);
  const managerPasswordHash = await bcrypt.hash(DEV_ACCOUNTS.manager.password, 10);
  const tenantPasswordHash = await bcrypt.hash(DEV_ACCOUNTS.tenant.password, 10);

  const owner = await prisma.user.create({
    data: {
      email: DEV_ACCOUNTS.owner.email,
      passwordHash: ownerPasswordHash,
      name: DEV_ACCOUNTS.owner.name,
      phoneNumber: DEV_ACCOUNTS.owner.phoneNumber,
      role: 'OWNER'
    }
  });

  const manager = await prisma.user.create({
    data: {
      email: DEV_ACCOUNTS.manager.email,
      passwordHash: managerPasswordHash,
      name: DEV_ACCOUNTS.manager.name,
      phoneNumber: DEV_ACCOUNTS.manager.phoneNumber,
      role: 'MANAGER',
      managerTermsAcceptedAt: new Date(),
      billingStatus: 'CURRENT',
      payoutPhoneNumber: DEV_ACCOUNTS.manager.phoneNumber,
      payoutNetwork: 'MTN'
    }
  });

  const tenant = await prisma.user.create({
    data: {
      email: DEV_ACCOUNTS.tenant.email,
      passwordHash: tenantPasswordHash,
      name: DEV_ACCOUNTS.tenant.name,
      phoneNumber: DEV_ACCOUNTS.tenant.phoneNumber,
      role: 'TENANT',
      tenantId: DEV_ACCOUNTS.tenant.tenantId
    }
  });

  console.log('✅ Created users:');
  console.log(`   Owner: ${owner.email} (ID: ${owner.id})`);
  console.log(`   Manager: ${manager.email} (ID: ${manager.id})`);
  console.log(`   Tenant: ${tenant.email} (ID: ${tenant.id})`);

  return { owner, manager, tenant, tenantIdentity };
}

async function createTestData(users: any) {
  console.log('🏠 Creating test properties and data...');

  const { owner, manager, tenant, tenantIdentity } = users;

  // Create property owned by owner and managed by manager
  const property = await prisma.property.create({
    data: {
      name: 'Dev Test Apartments',
      location: 'Kampala, Uganda',
      ownerId: owner.id,
      managerId: manager.id
    }
  });

  console.log('✅ Created property:', property.name);

  // Create units
  const units = await Promise.all([
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: 'A1',
        rentAmount: 500000 // 500,000 UGX
      }
    }),
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: 'A2',
        rentAmount: 600000 // 600,000 UGX
      }
    }),
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: 'B1',
        rentAmount: 550000 // 550,000 UGX
      }
    })
  ]);

  console.log('✅ Created units:', units.map(u => u.unitNumber).join(', '));

  // Create active lease for tenant in unit A1
  const lease = await prisma.lease.create({
    data: {
      tenantId: tenant.tenantId,
      propertyId: property.id,
      unitId: units[0].id,
      rentAmount: units[0].rentAmount,
      startDate: new Date('2024-01-01'),
      status: 'ACTIVE'
    }
  });

  console.log('✅ Created lease for unit A1');

  // Create some payment history
  const currentDate = new Date();
  const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  await Promise.all([
    prisma.payment.create({
      data: {
        tenantId: tenant.tenantId,
        propertyId: property.id,
        unitId: units[0].id,
        amount: units[0].rentAmount,
        status: 'PAID',
        paymentMethod: 'Mobile Money',
        transactionId: 'TXN-001',
        paymentDate: lastMonth,
        dueDate: lastMonth,
        billingPeriod: `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`
      }
    }),
    prisma.payment.create({
      data: {
        tenantId: tenant.tenantId,
        propertyId: property.id,
        unitId: units[0].id,
        amount: units[0].rentAmount,
        status: 'PENDING',
        paymentDate: thisMonth,
        dueDate: new Date(thisMonth.getTime() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        billingPeriod: `${thisMonth.getFullYear()}-${(thisMonth.getMonth() + 1).toString().padStart(2, '0')}`
      }
    })
  ]);

  console.log('✅ Created payment records');

  // Create a sample message
  await prisma.message.create({
    data: {
      fromUserId: tenant.id,
      toUserId: manager.id,
      leaseId: lease.id,
      subject: 'Maintenance Request',
      body: 'The kitchen faucet is leaking and needs repair.'
    }
  });

  console.log('✅ Created sample message');

  // Create invoice for current period (for manager billing)
  const invoice = await prisma.invoice.create({
    data: {
      managerId: manager.id,
      periodStart: thisMonth,
      periodEnd: new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0), // Last day of month
      subtotalAmount: units[0].rentAmount,
      feeRateBps: 399, // 3.99%
      feeAmount: Math.round(units[0].rentAmount * 0.0399),
      status: 'DUE',
      dueDate: new Date(thisMonth.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      lines: {
        create: {
          propertyId: property.id,
          unitId: units[0].id,
          rentAmount: units[0].rentAmount,
          tenantId: tenant.tenantId,
          leaseId: lease.id
        }
      }
    }
  });

  console.log('✅ Created manager invoice');

  return {
    property,
    units,
    lease,
    invoice
  };
}

async function main() {
  try {
    console.log('🚀 Setting up dev accounts and test data...\n');

    await cleanupDatabase();
    const users = await createDevAccounts();
    await createTestData(users);

    console.log('\n🎉 Dev setup completed successfully!\n');

    console.log('📋 DEV ACCOUNT CREDENTIALS:');
    console.log('==========================');
    console.log(`👑 OWNER:    ${DEV_ACCOUNTS.owner.email} / ${DEV_ACCOUNTS.owner.password}`);
    console.log(`👨‍💼 MANAGER:  ${DEV_ACCOUNTS.manager.email} / ${DEV_ACCOUNTS.manager.password}`);
    console.log(`👤 TENANT:   ${DEV_ACCOUNTS.tenant.email} / ${DEV_ACCOUNTS.tenant.password}`);
    console.log('\n📱 Test data created:');
    console.log('- 1 Property: "Dev Test Apartments"');
    console.log('- 3 Units: A1 (occupied), A2, B1');
    console.log('- 1 Active lease (Tenant in Unit A1)');
    console.log('- Payment history (1 paid, 1 pending)');
    console.log('- 1 Manager invoice (current billing period)');
    console.log('- 1 Sample message between tenant and manager');

  } catch (error) {
    console.error('❌ Error setting up dev accounts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as setupDevAccounts };
