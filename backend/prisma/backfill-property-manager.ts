import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillPropertyManager() {
  console.log('Starting property manager backfill...');

  // Find all properties missing managerId
  const propertiesWithoutManager = await prisma.property.findMany({
    where: {
      OR: [
        { managerId: '' },
        { managerId: null }
      ]
    }
  });

  console.log(`Found ${propertiesWithoutManager.length} properties without managerId`);

  if (propertiesWithoutManager.length === 0) {
    console.log('No backfill needed. All properties have managerId.');
    return;
  }

  // Find the first MANAGER user
  const manager = await prisma.user.findFirst({
    where: { role: 'MANAGER' },
    orderBy: { createdAt: 'asc' }
  });

  if (!manager) {
    const errorMessage =
      'BACKFILL FAILED: No MANAGER user found in the database. ' +
      'Please create a manager user before running this backfill script. ' +
      'Run: npm run seed:dev:manager or create a manager via the API.';
    throw new Error(errorMessage);
  }

  console.log(`Assigning unassigned properties to manager: ${manager.email} (${manager.id})`);

  // Assign all unassigned properties to the first manager
  for (const property of propertiesWithoutManager) {
    await prisma.property.update({
      where: { id: property.id },
      data: { managerId: manager.id }
    });
    console.log(`  ✓ Assigned property "${property.name}" (${property.id})`);
  }

  console.log(`\nBackfill complete! ${propertiesWithoutManager.length} properties assigned to ${manager.email}`);
}

// Idempotent: can be run multiple times safely
backfillPropertyManager()
  .catch((error) => {
    console.error('Backfill error:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
