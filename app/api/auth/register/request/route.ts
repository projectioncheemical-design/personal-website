import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const normalized = email.trim().toLowerCase();

    // generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // cleanup old tokens for this identifier
    await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });
    // store token
    await prisma.verificationToken.create({ data: { identifier: normalized, token: code, expires } });

    const appName = process.env.APP_NAME || "Projection";
    await sendEmail(
      normalized,
      `${appName} – Your verification code`,
      `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">
        <p>Your verification code is:</p>
        <h2 style="letter-spacing:3px">${code}</h2>
        <p>This code will expire in 5 minutes.</p>
      </div>`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("/api/auth/register/request error", e);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
