// Set a user's role by email
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.TARGET_EMAIL;
  const role = process.env.TARGET_ROLE;
  if (!email || !role) {
    console.error('Usage: set TARGET_EMAIL and TARGET_ROLE env vars');
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { role } });
  console.log('Updated role:', email, '->', role);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
