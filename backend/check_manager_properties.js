const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkManagerProperties() {
  try {
    console.log('=== CHECKING MANAGER PROPERTIES ===');

    // Find dev manager
    const devManager = await prisma.user.findFirst({
      where: { email: 'dev.manager@test.com' },
      select: { id: true, email: true }
    });

    if (!devManager) {
      console.log('❌ Dev manager not found');
      return;
    }

    console.log('✅ Found dev manager:', devManager.email);

    // Get manager's properties with units and leases
    const properties = await prisma.property.findMany({
      where: { managerId: devManager.id },
      include: {
        units: {
          include: {
            leases: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      }
    });

    console.log(`\n📊 Manager has ${properties.length} properties:`);

    properties.forEach(property => {
      const vacantUnits = property.units.filter(u => u.leases.length === 0);
      const occupiedUnits = property.units.filter(u => u.leases.length > 0);

      console.log(`\n🏠 ${property.name}:`);
      console.log(`   📦 Total units: ${property.units.length}`);
      console.log(`   ✅ Vacant units: ${vacantUnits.length}`);
      console.log(`   ❌ Occupied units: ${occupiedUnits.length}`);

      if (vacantUnits.length > 0) {
        console.log('   📋 Vacant unit details:');
        vacantUnits.forEach(unit => {
          console.log(`      - Unit ${unit.unitNumber}: UGX ${unit.rentAmount}/month`);
        });
      } else {
        console.log('   ⚠️  No vacant units available!');
        console.log('   📋 Occupied unit details:');
        occupiedUnits.forEach(unit => {
          console.log(`      - Unit ${unit.unitNumber}: UGX ${unit.rentAmount}/month (has ${unit.leases.length} lease)`);
        });
      }
    });

    // Check if we need to create test data
    const totalVacantUnits = properties.reduce((sum, prop) =>
      sum + prop.units.filter(u => u.leases.length === 0).length, 0
    );

    if (totalVacantUnits === 0) {
      console.log('\n🚨 ISSUE: No vacant units found!');
      console.log('💡 SOLUTION: Need to create a property with vacant units or free up existing units');
      console.log('🔧 QUICK FIX: Create a new property with units for testing');
    } else {
      console.log(`\n✅ Found ${totalVacantUnits} vacant units total`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkManagerProperties();
