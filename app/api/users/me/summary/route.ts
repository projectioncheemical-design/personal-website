import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // @ts-expect-error custom fields
  const role: string | undefined = session.user?.role;
  // @ts-expect-error id present on token/session
  const userId: string | undefined = session.user?.id || (session.user as any)?.sub;

  try {
    const whereAll: any = {};
    const whereMine: any = userId ? { userId } : { userId: "__none__" };

    const where = role === "ADMIN" || role === "MANAGER" ? whereAll : whereMine;

    const agg = await prisma.invoice.aggregate({
      where,
      _sum: { total: true, collection: true, balance: true },
      _count: { _all: true },
    });

    return NextResponse.json({
      ok: true,
      totals: {
        invoiceCount: agg._count?._all || 0,
        salesTotal: agg._sum.total || 0,
        collectionsTotal: agg._sum.collection || 0,
        balancesTotal: agg._sum.balance || 0,
      },
      scope: role === "ADMIN" || role === "MANAGER" ? "org" : "mine",
    });
  } catch (e) {
    console.error("/api/users/me/summary GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
