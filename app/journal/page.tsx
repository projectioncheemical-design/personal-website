"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

type Entry = {
  id: string;
  date: string;
  invoice: { serial: string } | null;
  customer: { id: string; name: string } | null;
  user: { id: string; name: string | null; email: string | null } | null;
  total: string | number;
  collection: string | number;
  balance: string | number;
};

export default function JournalPage() {
  const { data: session } = useSession();
  // @ts-expect-error role on session
  const role: string | undefined = session?.user?.role;
  const canEdit = useMemo(() => role === "ADMIN" || role === "MANAGER", [role]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totals, setTotals] = useState({ total: 0, collection: 0, balance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const egpFmt = useMemo(() => new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP" }), []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/journal?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setEntries(data.entries || []);
      setTotals(data.totals || { total: 0, collection: 0, balance: 0 });
    } catch (e: any) {
      setError(e.message || "Failed to load journal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* initial */ }, []);

  async function saveCollection(id: string) {
    const val = Number(editing[id] ?? "");
    if (Number.isNaN(val) || val < 0) {
      setError("Invalid collection value");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/journal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: val }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setEditing(prev => { const c = { ...prev }; delete c[id]; return c; });
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to update");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Journal</h1>
        <a href="/invoice" className="text-sm underline">Back to Invoice</a>
      </div>

      <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm mb-1">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
          </div>
          <div className="flex items-end">
            <button onClick={load} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">Apply</button>
          </div>
          {error && <div className="flex items-end text-sm text-red-600">{error}</div>}
        </div>
      </div>

      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-sm font-medium border-b border-black/10 dark:border-white/10">
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Invoice</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-2">User</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-right">Collected</div>
          <div className="col-span-1 text-right">Balance</div>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No entries</div>
        ) : (
          entries.map(e => (
            <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-black/5 dark:border-white/5" key={e.id}>
              <div className="col-span-2 text-sm">{format(new Date(e.date), "dd/MM/yyyy HH:mm")}</div>
              <div className="col-span-2 text-sm">{e.invoice?.serial || "-"}</div>
              <div className="col-span-3 text-sm">{e.customer?.name || "-"}</div>
              <div className="col-span-2 text-sm">{e.user?.name || e.user?.email || "-"}</div>
              <div className="col-span-1 text-right text-sm">{egpFmt.format(Number(e.total))}</div>
              <div className="col-span-1 text-right text-sm">
                {canEdit ? (
                  <div className="flex items-center gap-2 justify-end">
                    <input
                      type="number"
                      defaultValue={Number(e.collection)}
                      onChange={(ev)=>setEditing(prev=>({...prev, [e.id]: ev.target.value}))}
                      className="w-24 rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-right"
                    />
                    <button onClick={()=>saveCollection(e.id)} className="rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-xs">Save</button>
                  </div>
                ) : (
                  egpFmt.format(Number(e.collection))
                )}
              </div>
              <div className="col-span-1 text-right text-sm">{egpFmt.format(Number(e.balance))}</div>
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
