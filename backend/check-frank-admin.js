const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFrankAdmin() {
    try {
        console.log('🔍 Checking frank@gmail.com account and admin permissions...\n');
        
        // Find user
        const user = await prisma.user.findUnique({
            where: { email: 'frank@gmail.com' },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            console.log('❌ User frank@gmail.com does not exist');
            console.log('   Creating account...\n');
            return;
        }

        console.log('✅ User found:');
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Created: ${user.createdAt}\n`);

        // Check admin permissions
        const adminPermission = await prisma.adminPermission.findUnique({
            where: { email: 'frank@gmail.com' }
        });

        if (!adminPermission) {
            console.log('❌ No admin permissions found for frank@gmail.com');
            console.log('   This account cannot access admin dashboard\n');
        } else {
            console.log('✅ Admin permissions found:');
            console.log(`   Super Admin: ${adminPermission.isSuperAdmin}`);
            console.log(`   Can Manage Posts: ${adminPermission.canManagePosts}`);
            console.log(`   Can Manage Users: ${adminPermission.canManageUsers}`);
            console.log(`   Can View Analytics: ${adminPermission.canViewAnalytics}`);
            console.log(`   Created: ${adminPermission.createdAt}\n`);
        }

        console.log('📊 Summary:');
        console.log(`   User exists: ✅`);
        console.log(`   Admin permissions: ${adminPermission ? '✅' : '❌'}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkFrankAdmin();
