import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Allow EMPLOYEE, MANAGER, ADMIN
  const role = (session.user as any)?.role as string | undefined;
  if (role !== "EMPLOYEE" && role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) {
        const dt = new Date(to);
        // include end date through end of day
        dt.setHours(23, 59, 59, 999);
        where.date.lte = dt;
      }
    }

    const entries = await prisma.journal.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        invoice: { select: { serial: true } },
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const totals = entries.reduce(
      (acc, e) => {
        acc.total += Number(e.total as any);
        acc.collection += Number(e.collection as any);
        acc.balance += Number(e.balance as any);
        return acc;
      },
      { total: 0, collection: 0, balance: 0 }
    );

    return NextResponse.json({ entries, totals });
  } catch (e) {
    console.error("/api/journal GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
