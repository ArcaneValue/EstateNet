const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testPassword() {
    try {
        console.log('🔐 Testing password for admin.estatenet@gmail.com...\n');
        
        const user = await prisma.user.findUnique({
            where: { email: 'admin.estatenet@gmail.com' }
        });
        
        if (!user) {
            console.log('❌ User not found!');
            return;
        }
        
        console.log('User found:');
        console.log('  Email:', user.email);
        console.log('  Role:', user.role);
        console.log('  Password hash:', user.passwordHash.substring(0, 20) + '...');
        
        const password = 'Ak47grave';
        console.log('\nTesting password:', password);
        
        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log('Password valid:', isValid ? '✅ YES' : '❌ NO');
        
        if (!isValid) {
            console.log('\n🔧 Resetting password...');
            const newHash = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { email: 'admin.estatenet@gmail.com' },
                data: { passwordHash: newHash }
            });
            console.log('✅ Password reset complete!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testPassword();
