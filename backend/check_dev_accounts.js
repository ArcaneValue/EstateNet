const { PrismaClient } = require('@prisma/client');

async function checkDevAccounts() {
    const prisma = new PrismaClient();
    
    try {
        const devEmails = [
            'dev.owner@test.com',
            'dev.manager@test.com', 
            'dev.tenant@test.com'
        ];
        
        for (const email of devEmails) {
            const user = await prisma.user.findUnique({
                where: { email },
                select: { id: true, email: true, role: true, createdAt: true }
            });
            
            if (user) {
                console.log(`✅ FOUND: ${email} (${user.role}) - Created: ${user.createdAt}`);
            } else {
                console.log(`❌ MISSING: ${email}`);
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDevAccounts();
