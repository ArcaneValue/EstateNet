const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupAdminAccounts() {
  try {
    console.log('Setting up admin accounts...\n');
    
    const newPassword = 'Ak47grave';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const adminAccounts = [
      { email: 'admin.estatenet@gmail.com', name: 'EstateNet Admin' },
      { email: 'muculezi@gmail.com', name: 'Admin User' }
    ];
    
    for (const admin of adminAccounts) {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: admin.email }
      });
      
      if (existingUser) {
        // Update password
        await prisma.user.update({
          where: { email: admin.email },
          data: { passwordHash: hashedPassword }
        });
        console.log(`✅ Updated password for existing user: ${admin.email}`);
      } else {
        // Create new user account
        await prisma.user.create({
          data: {
            email: admin.email,
            name: admin.name,
            passwordHash: hashedPassword,
            role: 'OWNER' // Default role, can be any role
          }
        });
        console.log(`✅ Created new user account: ${admin.email}`);
      }
      
      // Ensure admin permissions exist
      const existingPermission = await prisma.adminPermission.findUnique({
        where: { email: admin.email }
      });
      
      if (!existingPermission) {
        await prisma.adminPermission.create({
          data: {
            email: admin.email,
            isSuperAdmin: true,
            canManagePosts: true,
            canManageUsers: true,
            canViewAnalytics: true
          }
        });
        console.log(`✅ Created admin permissions for: ${admin.email}`);
      } else {
        console.log(`✅ Admin permissions already exist for: ${admin.email}`);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Admin Accounts Ready');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: admin.estatenet@gmail.com');
    console.log('Email: muculezi@gmail.com');
    console.log('Password: Ak47grave');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdminAccounts();
