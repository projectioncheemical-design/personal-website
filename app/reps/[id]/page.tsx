"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";

type Invoice = {
  id: string;
  serial: string;
  date: string;
  total: string | number;
  collection: string | number;
  balance: string | number;
  customer: { id: string; name: string } | null;
};

type CustomerRow = { id: string; name: string; totalDebt: string | number };

type SummaryResponse = {
  ok: boolean;
  rep?: { id: string; name: string | null; email: string | null } | null;
  invoices: Invoice[];
  totals: {
    invoiceCount: number;
    salesTotal: string | number;
    collectionsTotal: string | number;
    balancesTotal: string | number;
  };
  customers: CustomerRow[];
};

export default function RepSummaryPage() {
  const { data: session } = useSession();
  const params = useParams<{ id: string }>();
  const repId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [reps, setReps] = useState<{ id: string; name: string | null }[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetch(`/api/reps/${repId}/summary?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Server error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (repId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repId]);

  // Load reps list for manager/admin to switch
  useEffect(() => {
    // @ts-expect-error custom role
    const role: string | undefined = session?.user?.role;
    if (role === "ADMIN" || role === "MANAGER") {
      (async () => {
        try {
          const res = await fetch("/api/reps");
          const j = await res.json();
          if (res.ok) {
            setReps((j.reps || []).map((r: any) => ({ id: r.id, name: r.name })));
          }
        } catch {}
      })();
    }
  }, [session]);

  const kpis = useMemo(() => {
    const t = data?.totals;
    return [
      { label: "عدد الفواتير", value: t?.invoiceCount ?? 0 },
      { label: "إجمالي المبيعات", value: Number(t?.salesTotal || 0).toLocaleString(undefined,{style:"currency",currency:"EGP"}) },
      { label: "إجمالي التحصيل", value: Number(t?.collectionsTotal || 0).toLocaleString(undefined,{style:"currency",currency:"EGP"}) },
      { label: "إجمالي المديونيات", value: Number(t?.balancesTotal || 0).toLocaleString(undefined,{style:"currency",currency:"EGP"}) },
    ];
  }, [data]);

  function exportInvoicesCsv() {
    const header = ["Date","Serial","Customer","Total","Collection","Balance"];
    const rows = (data?.invoices || []).map(inv => [
      new Date(inv.date).toLocaleDateString(),
      inv.serial,
      inv.customer?.name || "-",
      Number(inv.total||0),
      Number(inv.collection||0),
      Number(inv.balance||0),
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rep-${repId}-invoices.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{data?.rep?.name || "ملف المندوب"}</h1>
          {reps.length > 0 && (
            <select className="rounded border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm" value={repId}
              onChange={(e)=>{ window.location.href = `/reps/${e.target.value}`; }}>
              {reps.map(r => (
                <option key={r.id} value={r.id}>{r.name || r.id}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="rounded border border-black/10 dark:border-white/10 bg-transparent px-2 py-1" />
          <span>إلى</span>
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="rounded border border-black/10 dark:border-white/10 bg-transparent px-2 py-1" />
          <button onClick={load} className="rounded bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm">تطبيق</button>
          <button onClick={exportInvoicesCsv} className="rounded border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm">تصدير CSV</button>
          <button onClick={()=>window.print()} className="rounded border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm">طباعة / PDF</button>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section>
              <h2 className="text-lg font-semibold mb-3">أحدث الفواتير</h2>
              <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                    <tr>
                      <th className="text-right p-2">التاريخ</th>
                      <th className="text-right p-2">الرقم</th>
                      <th className="text-right p-2">العميل</th>
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
                          <td className="p-2">{inv.customer?.name || "—"}</td>
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

            <section>
              <h2 className="text-lg font-semibold mb-3">عملاء المندوب (المديونيات)</h2>
              <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                    <tr>
                      <th className="text-right p-2">العميل</th>
                      <th className="text-right p-2">المديونية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.length === 0 ? (
                      <tr><td colSpan={2} className="p-3 text-muted-foreground">لا يوجد عملاء.</td></tr>
                    ) : (
                      data.customers.map((c) => (
                        <tr key={c.id} className="border-t border-black/5 dark:border-white/5">
                          <td className="p-2"><a className="hover:underline" href={`/customers/${c.id}`}>{c.name}</a></td>
                          <td className="p-2">{Number(c.totalDebt).toLocaleString(undefined,{style:"currency",currency:"EGP"})}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
