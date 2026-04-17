const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTestAccounts() {
    try {
        console.log('🔍 Searching for accounts with names: Hazirah, Scarlet, Sarah...\n');

        // Find all users with these names (case-insensitive)
        const usersToDelete = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: 'hazirah', mode: 'insensitive' } },
                    { email: { contains: 'hazirah', mode: 'insensitive' } },
                    { name: { contains: 'scarlet', mode: 'insensitive' } },
                    { email: { contains: 'scarlet', mode: 'insensitive' } },
                    { name: { contains: 'sarah', mode: 'insensitive' } },
                    { email: { contains: 'sarah', mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                tenantId: true
            }
        });

        if (usersToDelete.length === 0) {
            console.log('✅ No accounts found with these names.');
            return;
        }

        console.log(`📋 Found ${usersToDelete.length} account(s) to delete:\n`);
        usersToDelete.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Created: ${user.createdAt}`);
            console.log('');
        });

        console.log('🗑️  Deleting accounts and associated data...\n');

        for (const user of usersToDelete) {
            console.log(`Deleting user: ${user.email}...`);

            // Delete associated data first (due to foreign key constraints)

            // Delete admin permissions if any
            await prisma.adminPermission.deleteMany({
                where: { email: user.email }
            });

            // Delete properties owned by this user
            const properties = await prisma.property.findMany({
                where: { ownerId: user.id }
            });

            for (const property of properties) {
                // Delete units in the property
                await prisma.unit.deleteMany({
                    where: { propertyId: property.id }
                });

                // Delete leases for this property
                await prisma.lease.deleteMany({
                    where: { propertyId: property.id }
                });
            }

            // Delete properties
            await prisma.property.deleteMany({
                where: { ownerId: user.id }
            });

            // Delete properties managed by this user
            await prisma.property.deleteMany({
                where: { managerId: user.id }
            });

            // Delete leases as tenant
            await prisma.lease.deleteMany({
                where: { tenantId: user.tenantId || '' }
            });

            // Delete tenant identity
            if (user.tenantId) {
                await prisma.tenantIdentity.deleteMany({
                    where: { tenantId: user.tenantId }
                });
            }

            // Delete invoices
            await prisma.invoice.deleteMany({
                where: { billedUserId: user.id }
            });

            // Delete service payments
            await prisma.servicePayment.deleteMany({
                where: { managerId: user.id }
            });

            // Delete forum posts
            await prisma.forumPost.deleteMany({
                where: { authorId: user.id }
            });

            // Delete forum comments
            await prisma.forumComment.deleteMany({
                where: { authorId: user.id }
            });

            // Delete forum upvotes
            await prisma.forumPostUpvote.deleteMany({
                where: { userId: user.id }
            });

            // Delete messages sent
            await prisma.message.deleteMany({
                where: { fromUserId: user.id }
            });

            // Delete messages received
            await prisma.message.deleteMany({
                where: { toUserId: user.id }
            });

            // Delete notifications
            await prisma.notification.deleteMany({
                where: { userId: user.id }
            });

            // Finally, delete the user
            await prisma.user.delete({
                where: { id: user.id }
            });

            console.log(`   ✅ Deleted: ${user.email}\n`);
        }

        console.log('🎉 All accounts deleted successfully!');
        console.log(`Total accounts removed: ${usersToDelete.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteTestAccounts();
