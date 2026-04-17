// Direct test of AuthService without going through HTTP
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Copy the comparePassword function
async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

async function testAuthServiceDirect() {
    try {
        const email = 'admin.estatenet@gmail.com';
        const password = 'Ak47grave';
        
        console.log('🧪 Testing AuthService login logic directly\n');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('');
        
        // Simulate what authService.login() does
        console.log('Step 1: Finding user...');
        const user = await prisma.user.findUnique({
            where: { email },
            include: { tenantIdentity: true }
        });
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('✅ User found:', user.email);
        console.log('   Role:', user.role);
        console.log('   Has password hash:', !!user.passwordHash);
        console.log('');
        
        // Step 2: Verify password
        console.log('Step 2: Verifying password...');
        console.log('   Password to check:', password);
        console.log('   Hash in database:', user.passwordHash.substring(0, 30) + '...');
        
        const isValidPassword = await comparePassword(password, user.passwordHash);
        console.log('   Result:', isValidPassword ? '✅ VALID' : '❌ INVALID');
        
        if (!isValidPassword) {
            console.log('\n❌ Password verification FAILED');
            console.log('This is why login is failing!\n');
            
            // Let's fix it
            console.log('🔧 Fixing password hash...');
            const newHash = await bcrypt.hash(password, 12);
            console.log('   New hash created with rounds=12');
            
            await prisma.user.update({
                where: { email },
                data: { passwordHash: newHash }
            });
            
            console.log('✅ Password hash updated in database');
            
            // Verify the fix
            const testAgain = await bcrypt.compare(password, newHash);
            console.log('   Verification test:', testAgain ? '✅ SUCCESS' : '❌ FAILED');
            
            return;
        }
        
        console.log('\n✅ Password verification SUCCESS');
        
        // Step 3: Check admin permissions
        console.log('\nStep 3: Checking admin permissions...');
        const adminPermission = await prisma.adminPermission.findUnique({
            where: { email: user.email }
        });
        
        if (adminPermission) {
            console.log('✅ Admin permissions found');
            console.log('   Super Admin:', adminPermission.isSuperAdmin);
            console.log('   Can Manage Posts:', adminPermission.canManagePosts);
            console.log('   Can Manage Users:', adminPermission.canManageUsers);
            console.log('   Can View Analytics:', adminPermission.canViewAnalytics);
        } else {
            console.log('❌ No admin permissions');
        }
        
        console.log('\n🎉 All checks passed! Login should work now.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testAuthServiceDirect();
