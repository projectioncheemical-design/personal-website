"use client";

import AuthBar from "@/components/auth-bar";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function SiteHeader() {
  const { data: session } = useSession();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/media", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) setLogoUrl(data.logo || null);
      } catch {}
    })();
  }, []);
  return (
    <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/80 dark:bg-black/50 border-b border-black/5 dark:border-white/10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded" />
            ) : null}
            <span className="text-xl font-semibold tracking-tight">Projection</span>
          </a>
          <nav className="hidden sm:flex gap-2 text-sm">
            <a href="/shop" className="rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-3 py-1.5 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white">Shop</a>
            <a href="/cart" className="rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-3 py-1.5 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white">Cart</a>
            {session && (
              <>
                {/* @ts-expect-error custom role */}
                {((session.user as any)?.role === 'EMPLOYEE' || (session.user as any)?.role === 'MANAGER' || (session.user as any)?.role === 'ADMIN') && (
                  <a href="/invoice" className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5">New Invoice</a>
                )}
                {/* @ts-expect-error custom role */}
                {((session.user as any)?.role === 'MANAGER' || (session.user as any)?.role === 'ADMIN') && (
                  <>
                    <a href="/stock" className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5">Stock</a>
                    <a href="/journal" className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5">Journal</a>
                    <a href="/customers" className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5">Customers</a>
                    <a href="/reports" className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5">Reports</a>
                    <a href="/admin/users" className="rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5">Users</a>
                    <a href="/settings" className="rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white px-3 py-1.5">Settings</a>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
        <AuthBar />
      </div>
    </header>
  );
}
