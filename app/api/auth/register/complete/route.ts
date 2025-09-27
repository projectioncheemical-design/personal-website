import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { email, code, password, name } = await req.json();
    if (!email || !code || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const normalized = String(email).trim().toLowerCase();
    const token = await prisma.verificationToken.findFirst({ where: { identifier: normalized, token: String(code) } });
    if (!token) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    if (new Date(token.expires) < new Date()) {
      await prisma.verificationToken.delete({ where: { token: token.token } });
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    let user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalized,
          name: name || null,
          role: "REQUESTER",
          passwordHash,
        },
      });
    } else {
      // If user exists but has no password, set one
      if (!user.passwordHash) {
        user = await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
      }
    }

    // consume token
    await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("/api/auth/register/complete error", e);
    return NextResponse.json({ error: "Failed to complete registration" }, { status: 500 });
  }
}
