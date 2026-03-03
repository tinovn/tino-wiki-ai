import { PrismaClient } from '.prisma/master-client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@tinowiki.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  const displayName = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  const existing = await prisma.superAdmin.findUnique({ where: { email } });

  if (existing) {
    console.log(`SuperAdmin already exists: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.superAdmin.create({
    data: {
      email,
      password: hashedPassword,
      displayName,
      role: 'SUPER_OWNER',
    },
  });

  console.log(`SuperAdmin created successfully:`);
  console.log(`  ID: ${admin.id}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Role: ${admin.role}`);
}

main()
  .catch((e) => {
    console.error('Failed to seed SuperAdmin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
