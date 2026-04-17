const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateAdminPasswords() {
  try {
    console.log('Updating admin passwords...');
    
    const newPassword = 'Ak47grave';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update admin.estatenet@gmail.com
    const admin1 = await prisma.user.updateMany({
      where: { email: 'admin.estatenet@gmail.com' },
      data: { passwordHash: hashedPassword }
    });
    
    console.log(`✅ Updated admin.estatenet@gmail.com (${admin1.count} records)`);
    
    // Update muculezi@gmail.com
    const admin2 = await prisma.user.updateMany({
      where: { email: 'muculezi@gmail.com' },
      data: { passwordHash: hashedPassword }
    });
    
    console.log(`✅ Updated muculezi@gmail.com (${admin2.count} records)`);
    
    console.log('\n🔐 New password for both accounts: Ak47grave');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPasswords();
