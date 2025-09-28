"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Invoice = {
  id: string;
  serial: string;
  date: string;
  total: string | number;
  collection: string | number;
  balance: string | number;
  user: { id: string; name: string | null } | null;
};

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  totalDebt: string | number;
};

type SummaryResponse = {
  ok: boolean;
  customer: Customer;
  invoices: Invoice[];
  totals: {
    invoiceCount: number;
    salesTotal: string | number;
    collectionsTotal: string | number;
    balancesTotal: string | number;
  };
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SummaryResponse | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetch(`/api/customers/${id}/summary?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Server error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); /* eslint-disable-line */ }, [id]);

  const kpis = useMemo(() => {
    const t = data?.totals;
    return [
      { label: "عدد الفواتير", value: t?.invoiceCount ?? 0 },
      { label: "إجمالي المبيعات", value: Number(t?.salesTotal || 0).toLocaleString(undefined,{style:"currency",currency:"EGP"}) },
      { label: "إجمالي التحصيل", value: Number(t?.collectionsTotal || 0).toLocaleString(undefined,{style:"currency",currency:"EGP"}) },
      { label: "إجمالي المديونيات", value: Number(t?.balancesTotal || 0).toLocaleString(undefined,{style:"currency",currency:"EGP"}) },
    ];
  }, [data]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">ملف العميل</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="rounded border border-black/10 dark:border-white/10 bg-transparent px-2 py-1" />
          <span>إلى</span>
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="rounded border border-black/10 dark:border-white/10 bg-transparent px-2 py-1" />
          <button onClick={load} className="rounded bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm">تطبيق</button>
          <a
            href={`/invoice?customer=${id}`}
            className="rounded bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-sm"
            title="إنشاء فاتورة جديدة لهذا العميل"
          >إنشاء فاتورة</a>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({length:4}).map((_,i)=> (
            <div key={i} className="h-24 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-600 dark:text-red-400">{error}</div>
      ) : !data ? (
        <div className="text-muted-foreground">لا توجد بيانات.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
                <div className="text-sm text-muted-foreground mb-1">{k.label}</div>
                <div className="text-xl font-semibold">{k.value as any}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 mb-8">
            <div className="font-medium">{data.customer.name}</div>
            <div className="text-sm text-muted-foreground">مديونية حالية: {Number(data.customer.totalDebt).toLocaleString(undefined,{style:"currency",currency:"EGP"})}</div>
            <div className="text-sm mt-1">{data.customer.phone || "—"} • {data.customer.email || "—"}</div>
          </div>

          <section>
            <h2 className="text-lg font-semibold mb-3">الفواتير</h2>
            <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                  <tr>
                    <th className="text-right p-2">التاريخ</th>
                    <th className="text-right p-2">الرقم</th>
                    <th className="text-right p-2">المندوب</th>
                    <th className="text-right p-2">الإجمالي</th>
                    <th className="text-right p-2">التحصيل</th>
                    <th className="text-right p-2">المديونية</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.length === 0 ? (
                    <tr><td colSpan={6} className="p-3 text-muted-foreground">لا توجد فواتير.</td></tr>
                  ) : (
                    data.invoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-black/5 dark:border-white/5">
                        <td className="p-2">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="p-2">{inv.serial}</td>
                        <td className="p-2">{inv.user?.name || "—"}</td>
                        <td className="p-2">{Number(inv.total).toLocaleString(undefined,{style:"currency",currency:"EGP"})}</td>
                        <td className="p-2">{Number(inv.collection).toLocaleString(undefined,{style:"currency",currency:"EGP"})}</td>
                        <td className="p-2">{Number(inv.balance).toLocaleString(undefined,{style:"currency",currency:"EGP"})}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
