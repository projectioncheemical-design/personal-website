"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

type Customer = { id: string; name: string };

type Entry = {
  id: string;
  date: string;
  total: number | string;
  collection: number | string;
  balance: number | string;
  invoice: { id: string; serial: string } | null;
};

export default function ReportsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totals, setTotals] = useState({ total: 0, collection: 0, balance: 0 });
  const [customerInfo, setCustomerInfo] = useState<{ id: string; name: string; totalDebt: number | string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/customers");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setCustomers((data.customers || []).map((c: any) => ({ id: c.id, name: c.name })));
      } catch (e: any) {
        console.error(e);
      }
    })();
  }, []);

  async function load() {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ customerId });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/reports/customer?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setEntries(data.entries || []);
      setCustomerInfo(data.customer || null);
      setTotals(data.totals || { total: 0, collection: 0, balance: 0 });
    } catch (e: any) {
      setError(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  const selectedCustomerName = useMemo(() => customers.find(c => c.id === customerId)?.name || customerInfo?.name || "-", [customers, customerId, customerInfo]);
  const egpFmt = useMemo(() => new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP" }), []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Customer Report</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm">Print</button>
          <a href="/invoice" className="text-sm underline">Back to Invoice</a>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-sm mb-1">Customer</label>
            <select value={customerId} onChange={(e)=>setCustomerId(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2">
              <option value="">Select customer…</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
          </div>
          <div className="flex items-end">
            <button onClick={load} disabled={!customerId} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">Apply</button>
          </div>
        </div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Customer</div>
            <div className="font-medium">{selectedCustomerName}</div>
          </div>
          <div className="rounded-lg border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
            <div className="text-emerald-700 dark:text-emerald-300 text-sm">Current Debt</div>
            <div className="font-semibold">{egpFmt.format(Number(customerInfo?.totalDebt || 0))}</div>
          </div>
          <div className="rounded-lg border border-blue-600/30 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
            <div className="text-blue-700 dark:text-blue-300 text-sm">Filtered Totals</div>
            <div className="font-semibold">{egpFmt.format(Number(totals.balance))} balance</div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-sm font-medium border-b border-black/10 dark:border-white/10">
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Serial</div>
          <div className="col-span-2 text-right">Total</div>
          <div className="col-span-2 text-right">Collected</div>
          <div className="col-span-2 text-right">Balance</div>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No entries</div>
        ) : (
          entries.map(e => (
            <div key={e.id} className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-black/5 dark:border-white/5">
              <div className="col-span-3 text-sm">{format(new Date(e.date), "dd/MM/yyyy")}</div>
              <div className="col-span-3 text-sm">{e.invoice?.serial || '-'}</div>
              <div className="col-span-2 text-right text-sm">{egpFmt.format(Number(e.total))}</div>
              <div className="col-span-2 text-right text-sm">{egpFmt.format(Number(e.collection))}</div>
              <div className="col-span-2 text-right text-sm">{egpFmt.format(Number(e.balance))}</div>
            </div>
          ))
        )}
        <div className="flex justify-end gap-6 px-4 py-3 text-sm font-medium">
          <div>Total: {egpFmt.format(Number(totals.total))}</div>
          <div>Collected: {egpFmt.format(Number(totals.collection))}</div>
          <div>Balance: {egpFmt.format(Number(totals.balance))}</div>
        </div>
      </div>
    </div>
  );
}
