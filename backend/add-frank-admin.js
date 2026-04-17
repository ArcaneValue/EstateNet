const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addFrankAdmin() {
    try {
        console.log('🔧 Adding admin permissions for frank@gmail.com...\n');
        
        // Check if admin permission already exists
        const existing = await prisma.adminPermission.findUnique({
            where: { email: 'frank@gmail.com' }
        });

        if (existing) {
            console.log('✅ Admin permissions already exist for frank@gmail.com');
            return;
        }

        // Create admin permission
        const adminPermission = await prisma.adminPermission.create({
            data: {
                email: 'frank@gmail.com',
                isSuperAdmin: true,
                canManagePosts: true,
                canManageUsers: true,
                canViewAnalytics: true
            }
        });

        console.log('✅ Admin permissions created successfully!');
        console.log(`   Email: ${adminPermission.email}`);
        console.log(`   Super Admin: ${adminPermission.isSuperAdmin}`);
        console.log(`   Can Manage Posts: ${adminPermission.canManagePosts}`);
        console.log(`   Can Manage Users: ${adminPermission.canManageUsers}`);
        console.log(`   Can View Analytics: ${adminPermission.canViewAnalytics}`);
        console.log(`   Created: ${adminPermission.createdAt}\n`);

        console.log('🎉 frank@gmail.com can now access the admin dashboard!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

addFrankAdmin();
