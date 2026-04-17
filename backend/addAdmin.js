const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAdmin() {
  try {
    console.log('Adding admin permissions...');
    
    // Add admin.estatenet@gmail.com as super admin
    const admin = await prisma.adminPermission.upsert({
      where: { email: 'admin.estatenet@gmail.com' },
      update: {},
      create: {
        email: 'admin.estatenet@gmail.com',
        isSuperAdmin: true,
        canManagePosts: true,
        canManageUsers: true,
        canViewAnalytics: true
      }
    });
    
    console.log('✅ Super admin created/verified:', admin.email);
    
    // You can add your own email here
    // Replace 'your.email@example.com' with your actual email
    const yourEmail = 'muculezi@gmail.com'; // Change this to your email
    
    const yourAdmin = await prisma.adminPermission.upsert({
      where: { email: yourEmail },
      update: {},
      create: {
        email: yourEmail,
        isSuperAdmin: true,
        canManagePosts: true,
        canManageUsers: true,
        canViewAnalytics: true
      }
    });
    
    console.log('✅ Your admin account created/verified:', yourAdmin.email);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAdmin();
