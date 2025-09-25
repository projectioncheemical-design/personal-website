import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { identifier } = await req.json();
    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
    }

    // If looks like email, return as-is
    if (identifier.includes("@")) {
      return NextResponse.json({ email: identifier.trim() });
    }

    // Otherwise treat as phone and resolve to user's email
    const user = await prisma.user.findFirst({
      where: { phone: identifier.trim() },
      select: { email: true },
    });
    if (!user?.email) {
      return NextResponse.json({ error: "No user with this phone or user has no email set" }, { status: 404 });
    }
    return NextResponse.json({ email: user.email });
  } catch (err) {
    console.error("/api/resolve-login error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
