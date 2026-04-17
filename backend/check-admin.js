const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminPermissions() {
    try {
        console.log('🔍 Checking admin permissions in database...\n');
        
        // Check if AdminPermission table exists and has data
        const adminPermissions = await prisma.$queryRaw`SELECT * FROM AdminPermission`;
        
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
            
            // Create admin permission
            const newAdmin = await prisma.$executeRaw`
                INSERT INTO AdminPermission (email, isSuperAdmin, canManagePosts, canManageUsers, canViewAnalytics, createdAt, updatedAt)
                VALUES ('admin.estatenet@gmail.com', 1, 1, 1, 1, datetime('now'), datetime('now'))
            `;
            
            console.log('✅ Admin permission created!');
        }
        
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email: 'admin.estatenet@gmail.com' }
        });
        
        if (user) {
            console.log('\n✅ User account exists for admin.estatenet@gmail.com');
        } else {
            console.log('\n❌ User account does NOT exist for admin.estatenet@gmail.com');
            console.log('Please create the user account first!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdminPermissions();
