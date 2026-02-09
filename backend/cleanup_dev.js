const { PrismaClient } = require('@prisma/client');

async function cleanupBadInvitation() {
    const prisma = new PrismaClient();
    
    try {
        // Delete the bad invitation with wrong email
        const badInvitation = await prisma.ownerManagerInvitation.findFirst({
            where: {
                managerEmail: 'manager-e2e-DEV@test.com'
            }
        });
        
        if (badInvitation) {
            await prisma.ownerManagerInvitation.delete({
                where: { id: badInvitation.id }
            });
            console.log('✅ Deleted bad invitation');
        } else {
            console.log('❌ No bad invitation found');
        }
        
        // Delete dev accounts to start fresh
        const devEmails = ['dev.owner@test.com', 'dev.manager@test.com', 'dev.tenant@test.com'];
        
        for (const email of devEmails) {
            const user = await prisma.user.findUnique({ where: { email } });
            if (user) {
                await prisma.user.delete({ where: { email } });
                console.log(`✅ Deleted ${email}`);
            }
        }
        
        console.log('✅ Cleanup complete - ready for fresh seed');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupBadInvitation();
