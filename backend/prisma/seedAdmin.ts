import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding super admin...');

  const existingAdmin = await (prisma as any).adminPermission.findUnique({
    where: { email: 'admin.estatenet@gmail.com' }
  });

  if (existingAdmin) {
    console.log('Super admin already exists');
    return;
  }

  const admin = await (prisma as any).adminPermission.create({
    data: {
      email: 'admin.estatenet@gmail.com',
      isSuperAdmin: true,
      canManagePosts: true,
      canManageUsers: true,
      canViewAnalytics: true
    }
  });

  console.log('Super admin created:', admin.email);
}

main()
  .catch((e) => {
    console.error('Error seeding admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
