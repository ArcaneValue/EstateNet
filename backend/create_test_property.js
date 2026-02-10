const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestPropertyWithVacantUnits() {
  try {
    console.log('=== CREATING TEST PROPERTY WITH VACANT UNITS ===');

    // Find dev manager and dev owner
    const [devManager, devOwner] = await Promise.all([
      prisma.user.findFirst({
        where: { email: 'dev.manager@test.com' },
        select: { id: true, email: true }
      }),
      prisma.user.findFirst({
        where: { email: 'dev.owner@test.com' },
        select: { id: true, email: true }
      })
    ]);

    if (!devManager) {
      console.log('❌ Dev manager not found');
      return;
    }

    if (!devOwner) {
      console.log('❌ Dev owner not found');
      return;
    }

    console.log('✅ Found dev manager:', devManager.email);
    console.log('✅ Found dev owner:', devOwner.email);

    // Create a new property with multiple vacant units
    const newProperty = await prisma.property.create({
      data: {
        name: 'Test Property for Invitations',
        location: 'Test Location',
        ownerId: devOwner.id,
        managerId: devManager.id,
        units: {
          create: [
            { unitNumber: 'B101', rentAmount: 1000 },
            { unitNumber: 'B102', rentAmount: 1200 },
            { unitNumber: 'B103', rentAmount: 1500 },
            { unitNumber: 'B104', rentAmount: 2000 }
          ]
        }
      },
      include: {
        units: true
      }
    });

    console.log(`\n✅ Created new property: ${newProperty.name}`);
    console.log(`📍 Location: ${newProperty.location}`);
    console.log(`📦 Units created: ${newProperty.units.length}`);

    newProperty.units.forEach(unit => {
      console.log(`   - Unit ${unit.unitNumber}: UGX ${unit.rentAmount}/month (VACANT)`);
    });

    console.log('\n🎯 NOW YOU CAN TEST THE INVITE TENANT MODAL:');
    console.log('1. Go to Invite Tenant modal');
    console.log('2. Select "Test Property for Invitations"');
    console.log('3. You should see 4 vacant units available');
    console.log('4. Select a unit and enter rent amount');
    console.log('5. Send Invitation button should work!');

  } catch (error) {
    console.error('Error creating property:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPropertyWithVacantUnits();
