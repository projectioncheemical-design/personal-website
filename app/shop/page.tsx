"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type Product = {
  id: string;
  name: string;
  capacity: string;
  price: number | string;
  images?: { url: string }[];
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setProducts(data.products || []);
      } catch (e: any) {
        setError(e.message || "فشل تحميل المنتجات");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function addToCart(p: Product) {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("cart") : null;
      const cart = raw ? JSON.parse(raw) as any[] : [];
      const idx = cart.findIndex((i) => i.id === p.id);
      if (idx >= 0) {
        cart[idx].qty += 1;
      } else {
        cart.push({ id: p.id, name: p.name, price: Number(p.price), image: p.images?.[0]?.url || null, qty: 1 });
      }
      window.localStorage.setItem("cart", JSON.stringify(cart));
      alert("تمت الإضافة إلى العربة");
    } catch {}
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">المتجر</h1>
        <a href="/cart" className="text-sm underline">العربة</a>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 animate-pulse">
              <div className="w-full h-40 bg-black/5 dark:bg-white/10 rounded-t-xl" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-2/3 bg-black/5 dark:bg-white/10 rounded" />
                <div className="h-3 w-1/2 bg-black/5 dark:bg-white/10 rounded" />
                <div className="h-5 w-1/3 bg-black/5 dark:bg-white/10 rounded" />
                <div className="h-9 w-full bg-black/5 dark:bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-muted-foreground">لا توجد منتجات حالياً.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900">
              {p.images?.[0]?.url ? (
                <Image
                  src={p.images[0].url}
                  alt={p.name}
                  width={1000}
                  height={160}
                  className="w-full h-40 object-cover rounded-t-xl"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-slate-200 to-slate-100 dark:from-zinc-800 dark:to-zinc-900 rounded-t-xl" />
              )}
              <div className="p-4">
                <h3 className="font-medium mb-1">{p.name}</h3>
                <div className="text-sm text-muted-foreground mb-2">السعة: {p.capacity}</div>
                <div className="font-semibold mb-3">{Number(p.price).toLocaleString(undefined,{style:"currency",currency:"EGP"})}</div>
                <button className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm" onClick={() => addToCart(p)}>
                  إضافة إلى العربة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
