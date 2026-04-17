const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setAdminPassword() {
    try {
        console.log('🔐 Setting password for admin.estatenet@gmail.com...\n');
        
        const password = 'Ak47grave';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update the user's password
        const updatedUser = await prisma.user.update({
            where: { email: 'admin.estatenet@gmail.com' },
            data: { passwordHash: hashedPassword }
        });
        
        console.log('✅ Password updated successfully!');
        console.log(`   User: ${updatedUser.email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Role: ${updatedUser.role}\n`);
        
        // Verify admin permissions exist
        const adminPerm = await prisma.adminPermission.findUnique({
            where: { email: 'admin.estatenet@gmail.com' }
        });
        
        if (adminPerm) {
            console.log('✅ Admin permissions confirmed:');
            console.log(`   Super Admin: ${adminPerm.isSuperAdmin}`);
            console.log(`   Can Manage Posts: ${adminPerm.canManagePosts}`);
            console.log(`   Can Manage Users: ${adminPerm.canManageUsers}`);
            console.log(`   Can View Analytics: ${adminPerm.canViewAnalytics}`);
        } else {
            console.log('❌ No admin permissions found!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

setAdminPassword();
