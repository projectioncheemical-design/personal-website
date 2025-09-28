import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // @ts-expect-error custom
  const role: string | undefined = session.user?.role;
  if (!(role === "ADMIN" || role === "MANAGER")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Return all users to choose a seller from (role included for context)
  const managers = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });
  return NextResponse.json({ ok: true, managers });
}
