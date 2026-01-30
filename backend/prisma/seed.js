"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const tenantId_1 = require("../src/utils/tenantId");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    const tenantIdentities = [
        {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phoneNumber: '+256700123456'
        },
        {
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phoneNumber: '+256700789012'
        },
        {
            name: 'Michael Johnson',
            email: 'michael.j@example.com',
            phoneNumber: '+256700345678'
        }
    ];
    for (const tenantData of tenantIdentities) {
        const tenantId = await (0, tenantId_1.generateUniqueTenantId)();
        const tenant = await prisma.tenantIdentity.create({
            data: {
                tenantId,
                ...tenantData
            }
        });
        console.log(`✅ Created tenant: ${tenant.name} (${tenant.tenantId})`);
    }
    console.log('🎉 Database seed completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map