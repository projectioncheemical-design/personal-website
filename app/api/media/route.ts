import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const [logo, background] = await Promise.all([
      prisma.media.findFirst({ where: { kind: "LOGO" }, orderBy: { createdAt: "desc" } }),
      prisma.media.findFirst({ where: { kind: "BACKGROUND" }, orderBy: { createdAt: "desc" } }),
    ]);
    return NextResponse.json({
      logo: logo?.url || null,
      background: background?.url || null,
    });
  } catch (e) {
    console.error("GET /api/media error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Allow absolute or relative URLs (e.g., "/uploads/..")
const SetMediaSchema = z.object({
  kind: z.enum(["LOGO", "BACKGROUND"]),
  url: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any)?.role as string | undefined;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any = null;
  try { body = await req.json(); } catch {}
  const parsed = SetMediaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });

  const { kind, url } = parsed.data;
  try {
    // normalize URL: allow relative paths as-is; store string directly
    const created = await prisma.media.create({ data: { kind, url } });
    return NextResponse.json({ ok: true, mediaId: created.id });
  } catch (e) {
    console.error("POST /api/media error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
