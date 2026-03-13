const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedOwnerData() {
  console.log('🌱 Seeding owner data...');

  try {
    // Find or create the owner user
    const ownerEmail = 'kazoora@gmail.com';
    let owner = await prisma.user.findUnique({
      where: { email: ownerEmail },
    });

    if (!owner) {
      const hashedPassword = await bcrypt.hash('Ak47grave.', 10);
      owner = await prisma.user.create({
        data: {
          email: ownerEmail,
          passwordHash: hashedPassword,
          name: 'Alex Kazoora',
          role: 'OWNER',
          phoneNumber: '+256 700 123 456',
        },
      });
      console.log('✅ Created owner user:', owner.email);
    } else {
      console.log('✅ Owner user already exists:', owner.email);
    }

    // Create sample properties
    const properties = [
      {
        name: 'Sunset Apartments',
        location: 'Kampala, Kololo',
        ownerId: owner.id,
      },
      {
        name: 'Green Valley Residences',
        location: 'Entebbe Road, Kajjansi',
        ownerId: owner.id,
      },
      {
        name: 'City Center Plaza',
        location: 'Kampala, Central Business District',
        ownerId: owner.id,
      },
    ];

    const createdProperties = [];
    for (const propertyData of properties) {
      const existingProperty = await prisma.property.findFirst({
        where: {
          name: propertyData.name,
          ownerId: owner.id,
        },
      });

      if (!existingProperty) {
        const property = await prisma.property.create({
          data: propertyData,
        });
        console.log(`✅ Created property: ${property.name}`);
        createdProperties.push(property);

        // Create units for each property
        const unitCount = propertyData.name.includes('Sunset') ? 12 : propertyData.name.includes('Green') ? 8 : 6;
        for (let i = 1; i <= unitCount; i++) {
          await prisma.unit.create({
            data: {
              unitNumber: `${i < 10 ? '0' : ''}${i}`,
              propertyId: property.id,
              rentAmount: propertyData.name.includes('City') ? 1500000 : propertyData.name.includes('Green') ? 1200000 : 800000,
            },
          });
        }
        console.log(`  ✅ Created ${unitCount} units for ${property.name}`);
      } else {
        console.log(`⏭️  Property already exists: ${propertyData.name}`);
        createdProperties.push(existingProperty);
      }
    }

    // Create sample manager users
    const managers = [
      {
        email: 'john.manager@estatenet.com',
        name: 'John Mugisha',
        phoneNumber: '+256 701 234 567',
      },
      {
        email: 'sarah.admin@estatenet.com',
        name: 'Sarah Nakato',
        phoneNumber: '+256 702 345 678',
      },
    ];

    const createdManagers = [];
    for (const managerData of managers) {
      let manager = await prisma.user.findUnique({
        where: { email: managerData.email },
      });

      if (!manager) {
        const hashedPassword = await bcrypt.hash('Manager123!', 10);
        manager = await prisma.user.create({
          data: {
            ...managerData,
            passwordHash: hashedPassword,
            role: 'MANAGER',
          },
        });
        console.log(`✅ Created manager: ${manager.name}`);
      } else {
        console.log(`⏭️  Manager already exists: ${manager.name}`);
      }
      createdManagers.push(manager);
    }

    // Assign managers to properties
    const allProperties = await prisma.property.findMany({
      where: { ownerId: owner.id },
    });

    if (allProperties.length > 0 && createdManagers.length > 0) {
      // Assign first manager to first property
      if (allProperties[0]) {
        await prisma.property.update({
          where: { id: allProperties[0].id },
          data: { managerId: createdManagers[0]?.id },
        });
        console.log(`✅ Assigned ${createdManagers[0]?.name} to ${allProperties[0].name}`);
      }

      // Assign second manager to second property
      if (allProperties[1] && createdManagers[1]) {
        await prisma.property.update({
          where: { id: allProperties[1].id },
          data: { managerId: createdManagers[1].id },
        });
        console.log(`✅ Assigned ${createdManagers[1].name} to ${allProperties[1].name}`);
      }
    }

    // Create sample owner-manager invitations
    if (allProperties[2]) {
      const existingInvitation = await prisma.ownerManagerInvitation.findFirst({
        where: {
          managerEmail: 'peter.manager@gmail.com',
          propertyId: allProperties[2].id,
        },
      });

      if (!existingInvitation) {
        await prisma.ownerManagerInvitation.create({
          data: {
            managerEmail: 'peter.manager@gmail.com',
            propertyId: allProperties[2].id,
            ownerId: owner.id,
            status: 'PENDING',
          },
        });
        console.log('✅ Created manager invitation for: peter.manager@gmail.com');
      }
    }

    if (allProperties[0]) {
      const existingInvitation2 = await prisma.ownerManagerInvitation.findFirst({
        where: {
          managerEmail: 'mary.admin@gmail.com',
          propertyId: allProperties[0].id,
        },
      });

      if (!existingInvitation2) {
        await prisma.ownerManagerInvitation.create({
          data: {
            managerEmail: 'mary.admin@gmail.com',
            propertyId: allProperties[0].id,
            ownerId: owner.id,
            status: 'PENDING',
          },
        });
        console.log('✅ Created manager invitation for: mary.admin@gmail.com');
      }
    }

    // Create sample tenant identities
    const tenants = [
      { name: 'David Okello', email: 'david.okello@gmail.com', phoneNumber: '+256 703 456 789' },
      { name: 'Grace Nambi', email: 'grace.nambi@gmail.com', phoneNumber: '+256 704 567 890' },
      { name: 'Robert Ssemakula', email: 'robert.s@gmail.com', phoneNumber: '+256 705 678 901' },
      { name: 'Betty Auma', email: 'betty.auma@gmail.com', phoneNumber: '+256 706 789 012' },
      { name: 'James Kato', email: 'james.kato@gmail.com', phoneNumber: '+256 707 890 123' },
    ];

    const createdTenants = [];
    for (const tenantData of tenants) {
      let tenantIdentity = await prisma.tenantIdentity.findUnique({
        where: { email: tenantData.email },
      });

      if (!tenantIdentity) {
        tenantIdentity = await prisma.tenantIdentity.create({
          data: {
            tenantId: `T${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
            name: tenantData.name,
            email: tenantData.email,
            phoneNumber: tenantData.phoneNumber,
          },
        });
        console.log(`✅ Created tenant identity: ${tenantIdentity.name}`);
      }
      createdTenants.push(tenantIdentity);
    }

    // Create leases for some units
    const allUnits = await prisma.unit.findMany({
      where: {
        property: { ownerId: owner.id },
      },
      include: { property: true },
      take: 5,
    });

    for (let i = 0; i < Math.min(allUnits.length, createdTenants.length); i++) {
      const unit = allUnits[i];
      const tenant = createdTenants[i];

      if (unit && tenant) {
        const existingLease = await prisma.lease.findFirst({
          where: { unitId: unit.id },
        });

        if (!existingLease) {
          const startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 6); // Started 6 months ago

          const endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + 1); // 1 year lease

          await prisma.lease.create({
            data: {
              propertyId: unit.propertyId,
              unitId: unit.id,
              tenantId: tenant.tenantId,
              startDate,
              endDate,
              rentAmount: unit.rentAmount,
              status: 'ACTIVE',
            },
          });
          console.log(`✅ Created lease for ${tenant.name} in ${unit.property.name} Unit ${unit.unitNumber}`);
        }
      }
    }

    // Create sample notifications
    const notifications = [
      {
        userId: owner.id,
        type: 'PROPERTY_CREATED',
        title: 'New Property Added',
        body: 'Sunset Apartments has been successfully created',
        metadata: { propertyName: 'Sunset Apartments' },
      },
      {
        userId: owner.id,
        type: 'MANAGER_INVITED',
        title: 'Manager Invitation Sent',
        body: 'Invitation sent to peter.manager@gmail.com',
        metadata: { email: 'peter.manager@gmail.com' },
      },
      {
        userId: owner.id,
        type: 'LEASE_APPROVED',
        title: 'New Lease Approved',
        body: 'Lease approved for David Okello',
        metadata: { tenantName: 'David Okello' },
      },
    ];

    for (const notificationData of notifications) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: notificationData.userId,
          title: notificationData.title,
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: notificationData,
        });
      }
    }
    console.log('✅ Created sample notifications');

    const finalProperties = await prisma.property.count({ where: { ownerId: owner.id } });
    const finalManagers = await prisma.user.count({ where: { role: 'MANAGER' } });
    const finalInvitations = await prisma.ownerManagerInvitation.count({ where: { ownerId: owner.id } });
    const finalTenants = await prisma.tenantIdentity.count();
    const finalLeases = await prisma.lease.count();

    console.log('\n🎉 Owner data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Owner: ${owner.email}`);
    console.log(`   - Properties: ${finalProperties}`);
    console.log(`   - Managers: ${finalManagers}`);
    console.log(`   - Manager Invitations: ${finalInvitations}`);
    console.log(`   - Tenants: ${finalTenants}`);
    console.log(`   - Active Leases: ${finalLeases}`);
    console.log('\n✨ You can now login with:');
    console.log(`   Email: ${ownerEmail}`);
    console.log(`   Password: Ak47grave.`);

  } catch (error) {
    console.error('❌ Error seeding owner data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedOwnerData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
