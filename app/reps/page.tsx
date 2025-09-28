"use client";

import { useEffect, useState } from "react";

type RepRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  invoiceCount: number;
  salesTotal: number | string;
  collectionsTotal: number | string;
  balancesTotal: number | string;
  customerCount: number;
  customerDebtTotal: number | string;
};

export default function RepsIndexPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reps, setReps] = useState<RepRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetch(`/api/reps?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setReps(json.reps || []);
    } catch (e: any) {
      setError(e?.message || "Server error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  function exportCsv() {
    const header = ["Rep Name","Email","Invoices","Sales","Collections","Balances","Customers","Debt"];
    const rows = reps.map(r => [
      r.name || "-", r.email || "-", r.invoiceCount,
      Number(r.salesTotal||0), Number(r.collectionsTotal||0), Number(r.balancesTotal||0),
      r.customerCount, Number(r.customerDebtTotal||0)
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reps-aggregates.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">المندوبون</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="rounded border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm" />
          <span>إلى</span>
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="rounded border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm" />
          <button onClick={load} className="rounded bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm">تطبيق</button>
          <button onClick={exportCsv} className="rounded border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm">تصدير CSV</button>
          <a href="/" className="text-sm underline">الرئيسية</a>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 animate-pulse">جارٍ التحميل…</div>
      ) : error ? (
        <div className="text-red-600 dark:text-red-400">{error}</div>
      ) : reps.length === 0 ? (
        <div className="text-muted-foreground">لا يوجد مندوبون.</div>
      ) : (
        <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="text-right p-2">المندوب</th>
                <th className="text-right p-2">الإيميل</th>
                <th className="text-right p-2">الدور</th>
                <th className="text-right p-2">عدد الفواتير</th>
                <th className="text-right p-2">إجمالي المبيعات</th>
                <th className="text-right p-2">إجمالي التحصيل</th>
                <th className="text-right p-2">إجمالي المديونيات</th>
                <th className="text-right p-2">عدد العملاء</th>
                <th className="text-right p-2">مديونية العملاء</th>
                <th className="text-right p-2">عرض</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((r) => (
                <tr key={r.id} className="border-t border-black/5 dark:border-white/5">
                  <td className="p-2">{r.name || "—"}</td>
                  <td className="p-2">{r.email || "—"}</td>
                  <td className="p-2">{r.role}</td>
                  <td className="p-2">{r.invoiceCount}</td>
                  <td className="p-2">{Number(r.salesTotal).toLocaleString(undefined,{style:"currency",currency:"EGP"})}</td>
                  <td className="p-2">{Number(r.collectionsTotal).toLocaleString(undefined,{style:"currency",currency:"EGP"})}</td>
                  <td className="p-2">{Number(r.balancesTotal).toLocaleString(undefined,{style:"currency",currency:"EGP"})}</td>
                  <td className="p-2">{r.customerCount}</td>
                  <td className="p-2">{Number(r.customerDebtTotal).toLocaleString(undefined,{style:"currency",currency:"EGP"})}</td>
                  <td className="p-2"><a href={`/reps/${r.id}`} className="text-blue-600 hover:underline">فتح</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
