import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function ensureAdmin(session: any) {
  const role = session?.user?.role as string | undefined;
  return !!session && (role === "ADMIN" || role === "MANAGER");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!ensureAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const products = await prisma.product.findMany({ include: { images: true }, orderBy: { name: "asc" } });
    return NextResponse.json({ products });
  } catch (e) {
    console.error("GET /api/admin/products", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!ensureAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.capacity || typeof body.price !== "number") {
    return NextResponse.json({ error: "name, capacity, price are required" }, { status: 400 });
  }
  const images: string[] = Array.isArray(body.images) ? body.images : [];
  try {
    const created = await prisma.product.create({
      data: {
        name: body.name,
        capacity: body.capacity,
        price: body.price,
        images: images.length
          ? { create: images.map((url) => ({ url, kind: "PRODUCT" as any })) }
          : undefined,
      },
      include: { images: true },
    });
    return NextResponse.json({ product: created }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Product name already exists" }, { status: 409 });
    }
    console.error("POST /api/admin/products", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!ensureAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    // First delete product images
    await prisma.media.deleteMany({ where: { productId: id } });
    // Attempt to delete product (will fail if referenced by invoice items)
    const deleted = await prisma.product.delete({ where: { id } });
    return NextResponse.json({ product: deleted });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json({ error: "Cannot delete product with existing invoice items" }, { status: 409 });
    }
    console.error("DELETE /api/admin/products", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
