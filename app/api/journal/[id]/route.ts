import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchSchema = z.object({ collection: z.number().min(0) });

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any)?.role as string | undefined;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(_req.url);
  const collectionStr = url.searchParams.get("collection");
  let body: any = null;
  try { body = await _req.json(); } catch {}
  const candidate = body && typeof body === "object" ? body : (collectionStr ? { collection: Number(collectionStr) } : null);
  const parsed = PatchSchema.safeParse(candidate);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });

  const id = params.id;
  const { collection } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.journal.findUnique({ where: { id }, select: { id: true, total: true, collection: true, balance: true, customerId: true, invoiceId: true } });
      if (!entry) throw new Error("Journal entry not found");

      const newBalance = Number(entry.total as any) - collection;
      const delta = newBalance - Number(entry.balance as any);

      // Update journal
      const updatedJournal = await tx.journal.update({ where: { id }, data: { collection, balance: newBalance } });

      // Update invoice if exists
      if (entry.invoiceId) {
        await tx.invoice.update({ where: { id: entry.invoiceId }, data: { collection, balance: newBalance } });
      }

      // Update customer totalDebt with delta
      if (entry.customerId && delta !== 0) {
        await tx.customer.update({ where: { id: entry.customerId }, data: { totalDebt: { increment: delta } } });
      }

      return { updatedJournal };
    });
    return NextResponse.json({ ok: true, journal: result.updatedJournal });
  } catch (e) {
    console.error("PATCH /api/journal/[id] error", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
