import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

function parseDateRange(url: URL) {
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  let gte: Date | undefined;
  let lte: Date | undefined;
  if (fromStr) {
    const d = new Date(fromStr);
    if (!isNaN(d.getTime())) gte = d;
  }
  if (toStr) {
    const d = new Date(toStr);
    if (!isNaN(d.getTime())) lte = d;
  }
  return { gte, lte };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // @ts-expect-error custom fields on session
  const role: string | undefined = session.user?.role;
  // @ts-expect-error id on session
  const sessionUserId: string | undefined = session.user?.id || (session.user as any)?.sub;

  const repId = params.id;
  if (!repId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Authorization: only ADMIN/MANAGER or the same rep
  if (!(role === "ADMIN" || role === "MANAGER" || sessionUserId === repId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const { gte, lte } = parseDateRange(url);
    const dateFilter = gte || lte ? { date: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {};
    const rep = await prisma.user.findUnique({ where: { id: repId }, select: { id: true, name: true, email: true } });

    // Invoices by this rep
    const invoices = await prisma.invoice.findMany({
      where: { userId: repId, ...(dateFilter as any) },
      orderBy: { date: "desc" },
      select: { id: true, serial: true, date: true, total: true, collection: true, balance: true, customer: { select: { id: true, name: true } } },
      take: 50,
    });

    // Aggregates
    const agg = await prisma.invoice.aggregate({
      where: { userId: repId, ...(dateFilter as any) },
      _sum: { total: true, collection: true, balance: true },
      _count: { _all: true },
    });

    // Customers owned by this rep with debts
    const customers = await prisma.customer.findMany({
      where: { ownerId: repId },
      select: { id: true, name: true, totalDebt: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      ok: true,
      rep,
      invoices,
      totals: {
        invoiceCount: agg._count?._all || 0,
        salesTotal: agg._sum.total || 0,
        collectionsTotal: agg._sum.collection || 0,
        balancesTotal: agg._sum.balance || 0,
      },
      customers,
    });
  } catch (err) {
    console.error("/api/reps/[id]/summary GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
