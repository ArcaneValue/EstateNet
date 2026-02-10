const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTenants() {
  try {
    console.log('=== CHECKING TENANT IDENTITIES ===');
    const tenants = await prisma.tenantIdentity.findMany({
      select: {
        tenantId: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('Recent tenant identities:');
    tenants.forEach(t => {
      console.log(`- ${t.tenantId}: ${t.name} (${t.email}) - ${t.createdAt}`);
    });
    
    console.log('\n=== CHECKING USERS WITH TENANT ROLE ===');
    const users = await prisma.user.findMany({
      where: { role: 'TENANT' },
      select: {
        id: true,
        email: true,
        name: true,
        tenantId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('Recent tenant users:');
    users.forEach(u => {
      console.log(`- ${u.id}: ${u.email} -> tenantId: ${u.tenantId}`);
    });
    
    console.log('\n=== TESTING TENANT ID LOOKUP ===');
    if (tenants.length > 0) {
      const testTenantId = tenants[0].tenantId;
      console.log(`Testing lookup for: ${testTenantId}`);
      
      const identity = await prisma.tenantIdentity.findUnique({
        where: { tenantId: testTenantId },
        select: {
          tenantId: true,
          name: true,
          email: true
        }
      });
      
      if (identity) {
        console.log('✅ Lookup SUCCESS:', identity);
      } else {
        console.log('❌ Lookup FAILED: Identity not found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenants();
