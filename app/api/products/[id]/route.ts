import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
      },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const recentItems = await prisma.invoiceItem.findMany({
      where: { productId: id },
      orderBy: { invoice: { date: "desc" } },
      take: 10,
      select: {
        id: true,
        capacity: true,
        price: true,
        quantity: true,
        total: true,
        invoice: {
          select: { id: true, serial: true, date: true, customer: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ product, recentItems });
  } catch (e) {
    console.error("/api/products/[id] GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
