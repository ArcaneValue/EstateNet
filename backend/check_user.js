const { PrismaClient } = require('@prisma/client');

async function checkUser() {
    const prisma = new PrismaClient();
    
    try {
        // Check for manager users with e2e email pattern
        const users = await prisma.user.findMany({
            where: {
                email: {
                    contains: 'manager-e2e-'
                },
                role: 'MANAGER'
            },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true
            }
        });
        
        console.log(`Found ${users.length} manager users with e2e pattern:`);
        users.forEach(user => {
            console.log(`- ID: ${user.id}, Email: ${user.email}, Created: ${user.createdAt}`);
        });
        
        // Check total managers
        const totalManagers = await prisma.user.count({
            where: { role: 'MANAGER' }
        });
        console.log(`\nTotal manager users in DB: ${totalManagers}`);
        
    } catch (error) {
        console.error('Database query error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser();
