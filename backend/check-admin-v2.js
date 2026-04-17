const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminPermissions() {
    try {
        console.log('🔍 Checking admin permissions in database...\n');
        
        // Use Prisma's generated client instead of raw SQL
        const adminPermissions = await prisma.adminPermission.findMany();
        
        console.log('📊 Admin Permissions found:', adminPermissions.length);
        
        if (adminPermissions.length > 0) {
            console.log('\n✅ Admin permissions exist:');
            adminPermissions.forEach(admin => {
                console.log(`  - Email: ${admin.email}`);
                console.log(`    Super Admin: ${admin.isSuperAdmin}`);
                console.log(`    Can Manage Posts: ${admin.canManagePosts}`);
                console.log(`    Can Manage Users: ${admin.canManageUsers}`);
                console.log(`    Can View Analytics: ${admin.canViewAnalytics}\n`);
            });
        } else {
            console.log('\n❌ No admin permissions found!');
            console.log('Creating admin permissions for admin.estatenet@gmail.com...\n');
            
            // Create admin permission using Prisma
            const newAdmin = await prisma.adminPermission.create({
                data: {
                    email: 'admin.estatenet@gmail.com',
                    isSuperAdmin: true,
                    canManagePosts: true,
                    canManageUsers: true,
                    canViewAnalytics: true
                }
            });
            
            console.log('✅ Admin permission created for:', newAdmin.email);
        }
        
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email: 'admin.estatenet@gmail.com' }
        });
        
        if (user) {
            console.log('\n✅ User account exists for admin.estatenet@gmail.com');
            console.log(`   User ID: ${user.id}`);
            console.log(`   Role: ${user.role}`);
        } else {
            console.log('\n❌ User account does NOT exist for admin.estatenet@gmail.com');
            console.log('   This user needs to be created first!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdminPermissions();
