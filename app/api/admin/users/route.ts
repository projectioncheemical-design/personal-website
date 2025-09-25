import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-expect-error custom role on session
  const role = session?.user?.role as string | undefined;
  if (!session || (role !== "ADMIN" && role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role") as any | null;

  const users = await prisma.user.findMany({
    where: roleFilter ? { role: roleFilter } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-expect-error custom role on session
  const role = session?.user?.role as string | undefined;
  if (!session || (role !== "ADMIN" && role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.userId || !body?.role) {
    return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
  }
  const targetRole = body.role as string;
  if (![`REQUESTER`, `EMPLOYEE`].includes(targetRole)) {
    return NextResponse.json({ error: "Invalid role change" }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: body.userId },
      data: { role: targetRole as any },
      select: { id: true, name: true, username: true, email: true, phone: true, role: true },
    });
    return NextResponse.json({ user: updated });
  } catch (e) {
    console.error("PATCH /api/admin/users error", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
