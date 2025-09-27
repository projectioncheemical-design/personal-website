// List users with ADMIN or MANAGER roles (read-only)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { OR: [{ role: 'ADMIN' }, { role: 'MANAGER' }] },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  if (admins.length === 0) {
    console.log('No ADMIN or MANAGER users found.');
  } else {
    console.log('ADMIN/MANAGER users:');
    for (const u of admins) {
      console.log(`- ${u.email || u.name || u.id} [${u.role}] (id=${u.id})`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
