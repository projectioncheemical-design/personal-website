// Seed demo data for a representative: customers and invoices
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ensureProducts() {
  const list = [
    { name: 'Acid Alpha', capacity: '20L', price: 150.0 },
    { name: 'Base Beta', capacity: '10L', price: 95.0 },
    { name: 'Solvent Prime', capacity: '5L', price: 50.0 },
  ];
  for (const p of list) {
    const existing = await prisma.product.findUnique({ where: { name: p.name } });
    if (!existing) {
      await prisma.product.create({ data: p });
    }
  }
}

async function main() {
  const email = process.env.REP_EMAIL || 'gwad@example.com';
  let rep = await prisma.user.findUnique({ where: { email } });
  if (!rep) {
    throw new Error(`Representative user not found: ${email}. Seed user first.`);
  }

  await ensureProducts();
  const products = await prisma.product.findMany({ where: { name: { in: ['Acid Alpha','Base Beta','Solvent Prime'] } }, orderBy: { name: 'asc' } });
  if (products.length < 3) throw new Error('Not enough products available.');

  // Create two customers owned by this rep if not exist
  async function ensureCustomer(name, phone) {
    let c = await prisma.customer.findFirst({ where: { name, ownerId: rep.id } });
    if (!c) {
      c = await prisma.customer.create({ data: { name, ownerId: rep.id, phone, totalDebt: 0 } });
    } else if (c.ownerId !== rep.id) {
      c = await prisma.customer.update({ where: { id: c.id }, data: { ownerId: rep.id } });
    }
    return c;
  }
  const c1 = await ensureCustomer('مصنع الشرق', '0100000001');
  const c2 = await ensureCustomer('شركة الغرب', '0100000002');

  // Helper to create an invoice with items
  async function createInvoice({ serial, customerId, userId, items }) {
    const total = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const collection = Math.round(total * 0.4); // collected 40%
    const balance = total - collection;
    const inv = await prisma.invoice.create({
      data: {
        serial,
        customerId,
        userId,
        total,
        collection,
        balance,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            capacity: it.capacity,
            price: it.price,
            quantity: it.quantity,
            total: it.price * it.quantity,
          })),
        },
      },
    });
    // Update customer debt
    await prisma.customer.update({ where: { id: customerId }, data: { totalDebt: { increment: balance } } });
    return inv;
  }

  const now = new Date();
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  const serialBase = `DEM-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;

  // Create 5 invoices distributed among the two customers
  const invs = [
    { customerId: c1.id, items: [ { productId: products[0].id, capacity: products[0].capacity, price: Number(products[0].price), quantity: 2 } ] },
    { customerId: c1.id, items: [ { productId: products[1].id, capacity: products[1].capacity, price: Number(products[1].price), quantity: 3 } ] },
    { customerId: c2.id, items: [ { productId: products[2].id, capacity: products[2].capacity, price: Number(products[2].price), quantity: 5 } ] },
    { customerId: c2.id, items: [ { productId: products[0].id, capacity: products[0].capacity, price: Number(products[0].price), quantity: 1 } ] },
    { customerId: c1.id, items: [ { productId: products[2].id, capacity: products[2].capacity, price: Number(products[2].price), quantity: 4 } ] },
  ];

  let idx = 1;
  for (const spec of invs) {
    const serial = `${serialBase}-${idx}`;
    await createInvoice({ serial, customerId: spec.customerId, userId: rep.id, items: spec.items });
    idx++;
  }

  console.log('Seeded demo data for rep:', { rep: rep.email, customers: [c1.name, c2.name] });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
