// Seed or update a user with given credentials (development use only)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.USER_EMAIL || 'gwad@example.com';
  const name = process.env.USER_NAME || 'gwad';
  const password = process.env.USER_PASSWORD || '0000';
  const role = process.env.USER_ROLE || 'EMPLOYEE'; // use EMPLOYEE as representative role

  const hash = await bcrypt.hash(password, 10);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        passwordHash: hash,
      },
    });
    console.log('Created user:', { email, name, role });
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { name, role, passwordHash: hash } });
    console.log('Updated user:', { email, name, role });
  }

  console.log('User ID:', user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
