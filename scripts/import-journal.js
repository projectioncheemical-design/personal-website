/*
 Usage:
   node scripts/import-journal.js --file "C:\\path\\to\\jornal.xlsx" --managerId <USER_ID> [--wipe]
 Notes:
   - Supports .xlsx, .xls, .csv
   - If --wipe is provided, it deletes invoices, invoiceItems, journals and resets customers' totalDebt to 0
*/

const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function readXlsx(filePath) {
  const XLSX = require('xlsx');
  const wb = XLSX.read(fs.readFileSync(filePath));
  const wsname = wb.SheetNames[0];
  const ws = wb.Sheets[wsname];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return rows;
}

function normalizeHeader(h) {
  const s = String(h || '').trim().toLowerCase();
  if (!s) return '';
  if (/(date|التاريخ)/.test(s)) return 'date';
  if (/(name|الاسم|العميل)/.test(s)) return 'customer';
  if (/(product|الصنف)/.test(s)) return 'product';
  if (/(size|الحجم|المقاس)/.test(s)) return 'size';
  if (/(price|السعر)/.test(s)) return 'price';
  if (/(quantity|الكمية)/.test(s)) return 'quantity';
  if (/(total|الاجمالي|الإجمالي)/.test(s)) return 'total';
  return s;
}

function excelSerialToDate(n) {
  // Excel serial date: days since 1899-12-30
  const base = new Date(Date.UTC(1899, 11, 30));
  const ms = Math.round(Number(n) * 86400000);
  return new Date(base.getTime() + ms);
}

function parseDate(v) {
  if (!v) return null;
  try {
    if (v instanceof Date) return v;
    if (typeof v === 'number' && isFinite(v)) {
      const d = excelSerialToDate(v);
      if (!isNaN(d.getTime())) return d;
    }
    const s = String(v).trim();
    // numeric string that looks like excel serial
    if (/^\d{2,6}$/.test(s)) {
      const d = excelSerialToDate(Number(s));
      if (!isNaN(d.getTime())) return d;
    }
    const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      const d = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const y = parseInt(m[3], 10);
      const Y = y < 100 ? 2000 + y : y;
      return new Date(Y, mo, d);
    }
    const dnum = Date.parse(s);
    const dt = isNaN(dnum) ? null : new Date(dnum);
    if (dt && dt.getFullYear() > 2100) return null;
    return dt;
  } catch {
    return null;
  }
}

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const filePath = getArg('file');
  const managerId = getArg('managerId');
  const wipe = hasFlag('wipe');

  if (!filePath) throw new Error('Missing --file');
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  if (!managerId) throw new Error('Missing --managerId');

  const rows = await readXlsx(filePath);
  if (!rows || rows.length < 2) throw new Error('Empty sheet');

  const header = rows[0].map(normalizeHeader);
  const dataRows = rows.slice(1).filter(r => r.some(c => String(c || '').trim() !== ''));

  if (wipe) {
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({}),
      prisma.journal.deleteMany({}),
      prisma.invoice.deleteMany({}),
      prisma.customer.updateMany({ data: { totalDebt: 0 } }),
    ]);
    console.log('Wiped existing transactions.');
  }

  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager) throw new Error('Manager user not found');

  const [existingCustomers, existingProducts] = await Promise.all([
    prisma.customer.findMany({ where: { ownerId: managerId }, select: { id: true, name: true, totalDebt: true } }),
    prisma.product.findMany({ select: { id: true, name: true, capacity: true, price: true } }),
  ]);
  const customerMap = new Map(existingCustomers.map(c => [c.name, c]));
  const productMap = new Map(existingProducts.map(p => [p.name, p]));

  const pad = n => (n < 10 ? `0${n}` : `${n}`);
  const now = new Date();
  const base = `IMP-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  let seq = 1;

  const getCol = (name, fallbackIndex) => {
    let idx = header.findIndex(h => h === name);
    if (idx === -1 && typeof fallbackIndex === 'number') idx = fallbackIndex;
    return idx;
  };

  const idxTotal = getCol('total', 0);
  const idxQty = getCol('quantity', 1);
  const idxPrice = getCol('price', 2);
  const idxSize = getCol('size', 3);
  const idxProduct = getCol('product', 4);
  const idxName = getCol('customer', 5);
  const idxDate = getCol('date', 6);

  let created = 0;
  let failed = 0;
  const txBatch = []; // unused in debug sequential mode

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    try {
      const rawDate = r[idxDate];
      const date = parseDate(rawDate) || new Date();
      const customerName = String(r[idxName] || '').trim() || 'بدون اسم';
      const productNameRaw = String(r[idxProduct] || '').trim() || '-';
      const productNameKey = productNameRaw === '' ? '-' : productNameRaw;
      const size = String(r[idxSize] || '').trim() || '-';
      const priceNum = Number(String(r[idxPrice] || '0').replace(/[^\-\d.]/g, '')) || 0;
      const qtyNum = Number(String(r[idxQty] || '0').replace(/[^\-\d.]/g, '')) || 0;
      const totalNum = Number(String(r[idxTotal] || '0').replace(/[^\-\d.]/g, '')) || 0;

      let customer = customerMap.get(customerName);
      if (!customer) {
        customer = await prisma.customer.create({ data: { name: customerName, ownerId: managerId, totalDebt: 0 } });
        customerMap.set(customerName, customer);
      }

      const isCollection = productNameKey.replace(/\s+/g, '') === 'تحصيل';
      const collection = isCollection ? Math.abs(totalNum) : 0;
      const itemPrice = isCollection ? collection : priceNum;
      const itemQty = isCollection ? 1 : (qtyNum || 1);
      const lineTotalNum = isCollection ? 0 : (itemPrice * itemQty);
      const invoiceTotalNum = isCollection ? 0 : (totalNum || lineTotalNum);
      const balanceNum = isCollection ? 0 : (invoiceTotalNum - collection);

      let product = productMap.get(isCollection ? 'تحصيل' : productNameKey);
      if (!product) {
        product = await prisma.product.create({ data: { name: isCollection ? 'تحصيل' : productNameKey, capacity: size || '-', price: itemPrice || 0, stockQty: 0 } });
        productMap.set(product.name, product);
      }

      const serial = `${base}-${seq++}`;
      const payload = {
        serial,
        date,
        customerId: customer.id,
        userId: managerId,
        total: String(Number.isFinite(Number(invoiceTotalNum)) ? Number(invoiceTotalNum) : 0),
        collection: String(Number.isFinite(Number(collection)) ? Number(collection) : 0),
        balance: String(Number.isFinite(Number(balanceNum)) ? Number(balanceNum) : 0),
        items: { create: [{ productId: product.id, capacity: size || product.capacity || '-', price: String(Number.isFinite(Number(itemPrice)) ? Number(itemPrice) : 0), quantity: Math.trunc(itemQty) || 1, total: String(Number.isFinite(Number(lineTotalNum)) ? Number(lineTotalNum) : 0) }] },
        journalEntries: { create: [{ date, user: { connect: { id: managerId } }, customer: { connect: { id: customer.id } }, total: String(Number(invoiceTotalNum) || 0), collection: String(Number(collection) || 0), balance: String(Number(balanceNum) || 0) }] },
      };
      try {
        await prisma.invoice.create({ data: payload });
        const deltaDebt = isCollection ? -Number(collection) : Number(balanceNum);
        if (Number.isFinite(deltaDebt) && deltaDebt !== 0) {
          await prisma.customer.update({ where: { id: customer.id }, data: { totalDebt: { increment: String(deltaDebt) } } });
        }
        created += 1;
      } catch (err) {
        failed += 1;
        console.error(`Create failed at row ${i + 2}:`, err?.message || err);
        console.error('Payload:', payload);
      }
    } catch (e) {
      failed += 1;
      console.error(`Row ${i + 2} failed:`, e?.message || e);
      console.error('Row data:', {
        date: dataRows[i]?.[idxDate], name: dataRows[i]?.[idxName], product: dataRows[i]?.[idxProduct], size: dataRows[i]?.[idxSize], qty: dataRows[i]?.[idxQty], price: dataRows[i]?.[idxPrice], total: dataRows[i]?.[idxTotal]
      });
      // do not abort; continue importing other rows
    }
  }

  // no-op: sequential mode

  console.log('Imported rows:', created, 'Failed rows:', failed);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
