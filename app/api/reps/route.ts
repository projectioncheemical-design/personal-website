import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // @ts-expect-error custom role
  const role: string | undefined = session.user?.role;
  if (!(role === "ADMIN" || role === "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  try {
    const url = new URL(req.url);
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");
    let gte: Date | undefined;
    let lte: Date | undefined;
    if (fromStr) { const d = new Date(fromStr); if (!isNaN(d.getTime())) gte = d; }
    if (toStr) {
      const d = new Date(toStr);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        lte = d;
      }
    }
    const dateFilter = gte || lte ? { date: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {};
    // list reps (employees) and optionally managers acting as reps
    const users = await prisma.user.findMany({
      where: { role: { in: ["EMPLOYEE", "MANAGER"] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });

    const userIds = users.map(u => u.id);

    // group invoices per rep
    const invAgg = await prisma.invoice.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, ...(dateFilter as any) },
      _count: { _all: true },
      _sum: { total: true, collection: true, balance: true },
    });

    // sum customer debts per rep (owner)
    const custAgg = await prisma.customer.groupBy({
      by: ["ownerId"],
      where: { ownerId: { in: userIds } },
      _count: { _all: true },
      _sum: { totalDebt: true },
    });

    const invMap = new Map(invAgg.map(a => [a.userId, a]));
    const custMap = new Map(custAgg.map(a => [a.ownerId, a]));

    const rows = users.map(u => {
      const ia = invMap.get(u.id);
      const ca = custMap.get(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        invoiceCount: ia?._count?._all || 0,
        salesTotal: ia?._sum?.total || 0,
        collectionsTotal: ia?._sum?.collection || 0,
        balancesTotal: ia?._sum?.balance || 0,
        customerCount: ca?._count?._all || 0,
        customerDebtTotal: ca?._sum?.totalDebt || 0,
      };
    });

    return NextResponse.json({ ok: true, reps: rows });
  } catch (err) {
    console.error("/api/reps GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
