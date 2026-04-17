const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function debugLogin() {
    try {
        const email = 'admin.estatenet@gmail.com';
        const password = 'Ak47grave';
        
        console.log('🔍 Debugging login for:', email);
        console.log('Password:', password);
        console.log('');
        
        // Step 1: Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { tenantIdentity: true }
        });
        
        if (!user) {
            console.log('❌ User not found in database');
            return;
        }
        
        console.log('✅ User found:');
        console.log('  ID:', user.id);
        console.log('  Email:', user.email);
        console.log('  Role:', user.role);
        console.log('  Has password hash:', !!user.passwordHash);
        console.log('  Password hash length:', user.passwordHash.length);
        console.log('  Password hash preview:', user.passwordHash.substring(0, 30) + '...');
        console.log('');
        
        // Step 2: Compare password
        console.log('🔐 Comparing password...');
        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log('  Result:', isValid ? '✅ VALID' : '❌ INVALID');
        console.log('');
        
        if (!isValid) {
            console.log('⚠️ Password mismatch detected!');
            console.log('Checking if hash format is correct...');
            console.log('Hash starts with $2a$ or $2b$:', user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$'));
            
            // Try creating a new hash with bcrypt rounds 12 (what the code uses)
            console.log('\n🔧 Creating new hash with rounds=12...');
            const newHash = await bcrypt.hash(password, 12);
            console.log('New hash preview:', newHash.substring(0, 30) + '...');
            
            const testValid = await bcrypt.compare(password, newHash);
            console.log('New hash validates:', testValid ? '✅ YES' : '❌ NO');
            
            // Update the user's password
            console.log('\n💾 Updating user password in database...');
            await prisma.user.update({
                where: { email },
                data: { passwordHash: newHash }
            });
            console.log('✅ Password updated!');
            
            // Test again
            const finalTest = await bcrypt.compare(password, newHash);
            console.log('Final validation:', finalTest ? '✅ SUCCESS' : '❌ FAILED');
        }
        
        // Step 3: Check admin permissions
        console.log('\n👑 Checking admin permissions...');
        const adminPerm = await prisma.adminPermission.findUnique({
            where: { email: user.email }
        });
        
        if (adminPerm) {
            console.log('✅ Admin permissions found:');
            console.log('  Super Admin:', adminPerm.isSuperAdmin);
            console.log('  Can Manage Posts:', adminPerm.canManagePosts);
            console.log('  Can Manage Users:', adminPerm.canManageUsers);
            console.log('  Can View Analytics:', adminPerm.canViewAnalytics);
        } else {
            console.log('❌ No admin permissions found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

debugLogin();
