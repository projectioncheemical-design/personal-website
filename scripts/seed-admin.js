// Seed an admin user with credentials from environment variables (development use only)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'projection@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email,
        name: 'Projection',
        role: 'ADMIN',
        passwordHash: hash,
      },
    });
    console.log('Created admin user:', email);
  } else {
    // Ensure role is ADMIN and set password
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN', passwordHash: hash } });
    console.log('Updated admin user password/role:', email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
