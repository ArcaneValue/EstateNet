import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    try {
        // Use raw query to check for null managerId (Prisma query builder rejects null for non-nullable fields)
        const nullResult = await prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(*) as count FROM "properties" WHERE "managerId" IS NULL
        `;
        const nullCount = Number(nullResult[0].count);

        // Check for empty string managerId
        const emptyResult = await prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(*) as count FROM "properties" WHERE "managerId" = ''
        `;
        const emptyCount = Number(emptyResult[0].count);

        // Get total property count
        const totalCount = await prisma.property.count();

        console.log(JSON.stringify({
            nullCount,
            emptyCount,
            totalCount,
            success: true
        }));
    } catch (error: any) {
        console.log(JSON.stringify({
            success: false,
            error: error.message
        }));
    } finally {
        await prisma.$disconnect();
    }
}

check();
