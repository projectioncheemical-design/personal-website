// Simple seed script to create initial products
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();
  if (count > 0) {
    console.log(`Products already exist: ${count}. Skipping.`);
    return;
  }

  await prisma.product.createMany({
    data: [
      { name: 'Chemical A', capacity: '20L', price: 150.0 },
      { name: 'Chemical B', capacity: '10L', price: 90.0 },
      { name: 'Solvent X', capacity: '5L', price: 45.5 },
    ],
  });

  console.log('Seeded initial products.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
