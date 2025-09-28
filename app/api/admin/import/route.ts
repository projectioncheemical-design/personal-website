import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// Use dynamic import for xlsx inside the handler to avoid bundling issues

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeHeader(h: any): string {
  const s = String(h || "").trim().toLowerCase();
  if (!s) return "";
  if (/(date|التاريخ)/.test(s)) return "date";
  if (/(name|الاسم|العميل)/.test(s)) return "customer";
  if (/(product|الصنف)/.test(s)) return "product";
  if (/(size|الحجم|المقاس)/.test(s)) return "size";
  if (/(price|السعر)/.test(s)) return "price";
  if (/(quantity|الكمية)/.test(s)) return "quantity";
  if (/(total|الاجمالي|الإجمالي)/.test(s)) return "total";
  return s;
}

function parseDate(v: any): Date | null {
  if (!v) return null;
  try {
    if (v instanceof Date) return v;
    const s = String(v).trim();
    // Try formats like dd/mm/yyyy or dd-mm-yyyy
    const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      const d = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const y = parseInt(m[3], 10);
      const Y = y < 100 ? 2000 + y : y;
      return new Date(Y, mo, d);
    }
    const dnum = Date.parse(s);
    return isNaN(dnum) ? null : new Date(dnum);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // @ts-expect-error custom
  const role: string | undefined = session.user?.role;
  if (!(role === "ADMIN" || role === "MANAGER")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const managerId = String(form.get("managerId") || "").trim();
  const wipe = String(form.get("wipe") || "false").toLowerCase() === "true";
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!managerId) return NextResponse.json({ error: "Missing managerId" }, { status: 400 });

  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(ab), { type: "array" });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any;
    if (!rows || rows.length < 2) return NextResponse.json({ error: "Empty sheet" }, { status: 400 });

    const header = rows[0].map(normalizeHeader);
    const dataRows = rows.slice(1).filter(r => r.some((c:any)=> String(c||"").trim() !== ""));

    // Optional destructive wipe
    if (wipe) {
      await prisma.$transaction([
        prisma.invoiceItem.deleteMany({}),
        prisma.journal.deleteMany({}),
        prisma.invoice.deleteMany({}),
        prisma.customer.updateMany({ data: { totalDebt: 0 } }),
      ]);
    }

    const now = new Date();
    const pad = (n:number)=> (n<10?`0${n}`:`${n}`);
    const base = `IMP-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
    let seq = 1;

    const getCol = (name: string, fallbackIndex?: number) => {
      let idx = header.findIndex(h => h === name);
      if (idx === -1 && typeof fallbackIndex === 'number') idx = fallbackIndex;
      return idx;
    };

    // Fallback positions if headers missing (assume order: total, quantity, price, size, product, name, date)
    const idxTotal = getCol('total', 0);
    const idxQty = getCol('quantity', 1);
    const idxPrice = getCol('price', 2);
    const idxSize = getCol('size', 3);
    const idxProduct = getCol('product', 4);
    const idxName = getCol('customer', 5);
    const idxDate = getCol('date', 6);

    // Ensure manager exists once
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager) return NextResponse.json({ error: "Manager not found" }, { status: 400 });

    // Prefetch existing customers (by this manager) and products to reduce DB roundtrips
    const [existingCustomers, existingProducts] = await Promise.all([
      prisma.customer.findMany({ where: { ownerId: managerId }, select: { id: true, name: true, totalDebt: true } }),
      prisma.product.findMany({ select: { id: true, name: true, capacity: true, price: true } }),
    ]);
    const customerMap = new Map<string, { id: string; name: string; totalDebt: any }>();
    for (const c of existingCustomers) customerMap.set(c.name, c as any);
    const productMap = new Map<string, { id: string; name: string; capacity: string; price: any }>();
    for (const p of existingProducts) productMap.set(p.name, p as any);

    let created = 0;
    const txBatch: any[] = [];

    for (const r of dataRows) {
      const rawDate = r[idxDate];
      const date = parseDate(rawDate) || new Date();
      const customerName = String(r[idxName] || "").trim() || "بدون اسم";
      const productNameRaw = String(r[idxProduct] || "").trim() || "-";
      const productNameKey = productNameRaw === "" ? "-" : productNameRaw;
      const size = String(r[idxSize] || "").trim() || "-";
      const priceNum = Number(String(r[idxPrice] || "0").replace(/[^\-\d.]/g, "")) || 0;
      const qtyNum = Number(String(r[idxQty] || "0").replace(/[^\-\d.]/g, "")) || 0;
      const totalNum = Number(String(r[idxTotal] || "0").replace(/[^\-\d.]/g, "")) || 0;

      // Ensure customer in cache
      let customer = customerMap.get(customerName);
      if (!customer) {
        const createdCust = await prisma.customer.create({ data: { name: customerName, ownerId: managerId, totalDebt: 0 } });
        customer = createdCust as any;
        customerMap.set(customerName, customer);
      }

      // Treat تحصيل (collection) specially
      const isCollection = productNameKey.replace(/\s+/g,"") === "تحصيل";
      const collection = isCollection ? Math.abs(totalNum) : 0;
      const itemPrice = isCollection ? collection : priceNum;
      const itemQty = isCollection ? 1 : (qtyNum || 1);
      const lineTotal = isCollection ? collection : (itemPrice * itemQty);
      const invoiceTotal = isCollection ? collection : (totalNum || lineTotal);
      const balance = isCollection ? 0 : (invoiceTotal - collection);

      // Ensure product in cache (use name only key)
      let product = productMap.get(isCollection ? "تحصيل" : productNameKey);
      if (!product) {
        const createdProd = await prisma.product.create({ data: { name: isCollection ? "تحصيل" : productNameKey, capacity: size || "-", price: itemPrice || 0, stockQty: 0 } });
        product = createdProd as any;
        productMap.set(product.name, product);
      }

      const serial = `${base}-${seq++}`;
      txBatch.push(
        prisma.invoice.create({
          data: {
            serial,
            date,
            customerId: customer.id,
            userId: managerId,
            total: invoiceTotal,
            collection,
            balance,
            items: {
              create: [{ productId: product.id, capacity: size || (product as any).capacity || '-', price: itemPrice, quantity: itemQty, total: lineTotal }],
            },
            journalEntries: {
              create: [{
                // date defaults now(), but we align
                date,
                user: { connect: { id: managerId } },
                customer: { connect: { id: customer.id } },
                total: invoiceTotal,
                collection,
                balance,
              }],
            },
          },
        })
      );

      if (balance !== 0) {
        txBatch.push(prisma.customer.update({ where: { id: customer.id }, data: { totalDebt: { increment: balance } } }));
      }

      created += 1;

      // Commit in chunks to avoid huge transactions
      if (txBatch.length >= 200) {
        await prisma.$transaction(txBatch as any);
        txBatch.length = 0;
      }
    }

    if (txBatch.length > 0) {
      await prisma.$transaction(txBatch as any);
    }

    return NextResponse.json({ ok: true, created });
  } catch (e) {
    console.error("/api/admin/import POST error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
