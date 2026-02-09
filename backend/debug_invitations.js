const { PrismaClient } = require('@prisma/client');

async function debugInvitations() {
    const prisma = new PrismaClient();
    
    try {
        console.log('Checking owner invitations...');
        const ownerInvitations = await prisma.ownerManagerInvitation.findMany({
            select: {
                id: true,
                propertyId: true,
                managerEmail: true,
                status: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        
        console.log('Owner invitations:');
        ownerInvitations.forEach(inv => {
            console.log(`- ${inv.id}: ${inv.managerEmail} (${inv.status}) - Property: ${inv.propertyId}`);
        });
        
        console.log('\nChecking manager users...');
        const managers = await prisma.user.findMany({
            where: { role: 'MANAGER' },
            select: { id: true, email: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        
        console.log('Manager users:');
        managers.forEach(manager => {
            console.log(`- ${manager.id}: ${manager.email}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugInvitations();
