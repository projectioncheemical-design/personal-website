"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  capacity: string;
  price: string; // serialized Decimal
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalDebt: string; // serialized Decimal
};

type Line = {
  productId: string;
  capacity: string;
  price: number;
  quantity: number;
};

export default function InvoiceForm() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [serial, setSerial] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [collection, setCollection] = useState(0);
  const [lines, setLines] = useState<Line[]>([{ productId: "", capacity: "", price: 0, quantity: 1 }]);

  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [proRes, cusRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/customers"),
        ]);
        const pro = await proRes.json().catch(() => ({ products: [] }));
        const cus = await cusRes.json().catch(() => ({ customers: [] }));
        if (!proRes.ok) throw new Error(pro?.error || "Failed to load products");
        if (!cusRes.ok) throw new Error(cus?.error || "Failed to load customers");
        if (mounted) {
          setProducts((pro.products || []).map((p: any) => ({ id: p.id, name: p.name, capacity: p.capacity, price: String(p.price) })));
          setCustomers(cus.customers || []);
        }
      } catch (e: any) {
        if (mounted) setError(e.message || "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    // If serial is empty, auto-generate a default serial like INV-YYYYMMDD-HHMMSS
    if (!serial) {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const s = `INV-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      setSerial(s);
    }
    return () => { mounted = false; };
  }, []);

  const totals = useMemo(() => {
    const lineTotals = lines.map(l => l.price * (l.quantity || 0));
    const total = lineTotals.reduce((a, b) => a + b, 0);
    const balance = total - (collection || 0);
    return { lineTotals, total, balance };
  }, [lines, collection]);

  const selectedCustomer = useMemo(() => customers.find(c => c.id === customerId) || null, [customers, customerId]);
  const currentDebt = useMemo(() => (selectedCustomer ? Number(selectedCustomer.totalDebt) : 0), [selectedCustomer]);
  const projectedDebt = useMemo(() => currentDebt + totals.balance, [currentDebt, totals.balance]);

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function onProductChange(idx: number, productId: string) {
    const p = products.find(pp => pp.id === productId);
    if (!p) {
      updateLine(idx, { productId, capacity: "", price: 0 });
    } else {
      updateLine(idx, { productId, capacity: p.capacity, price: Number(p.price) });
    }
  }

  function addLine() {
    setLines(prev => [...prev, { productId: "", capacity: "", price: 0, quantity: 1 }]);
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  async function createCustomer() {
    if (!newCustomer.name.trim()) return;
    setAddingCustomer(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setCustomers(prev => [...prev, data.customer]);
      setCustomerId(data.customer.id);
      setNewCustomer({ name: "", email: "", phone: "" });
    } catch (e: any) {
      setError(e.message || "Failed to create customer");
    } finally {
      setAddingCustomer(false);
    }
  }

  async function submitInvoice() {
    setSubmitStatus(null);
    setError(null);
    try {
      let effectiveSerial = serial.trim();
      if (!effectiveSerial) {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        effectiveSerial = `INV-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        setSerial(effectiveSerial);
      }
      if (!customerId) throw new Error("Customer is required");
      const validItems = lines
        .filter(l => l.productId && l.quantity > 0)
        .map(l => ({ productId: l.productId, quantity: l.quantity }));

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial: effectiveSerial,
          date,
          customerId,
          collection: Number(collection || 0),
          items: validItems,
        }),
      });
      const raw = await res.text();
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch {}
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setSubmitStatus("Invoice saved successfully.");
      // Reset form
      setSerial("");
      setDate(new Date().toISOString().slice(0, 10));
      setCustomerId("");
      setCollection(0);
      setLines([{ productId: "", capacity: "", price: 0, quantity: 1 }]);
    } catch (e: any) {
      setError(e.message || "Failed to save invoice");
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-red-600 dark:text-red-400">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Serial</label>
          <input value={serial} onChange={e => setSerial(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Collection (EGP)</label>
          <input type="number" min={0} value={collection} onChange={e => setCollection(Number(e.target.value))} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Customer</label>
        <div className="flex gap-2">
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="flex-1 rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2">
            <option value="">Select a customer…</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
            ))}
          </select>
          <button type="button" onClick={createCustomer} disabled={addingCustomer || !newCustomer.name.trim()} className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm">Add</button>
        </div>
        {selectedCustomer && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
              <div className="text-emerald-700 dark:text-emerald-300">Current Debt</div>
              <div className="font-semibold">{currentDebt.toLocaleString(undefined,{style:"currency",currency:"EGP"})}</div>
            </div>
            <div className="rounded-lg border border-blue-600/30 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
              <div className="text-blue-700 dark:text-blue-300">This Invoice Balance</div>
              <div className="font-semibold">{totals.balance.toLocaleString(undefined,{style:"currency",currency:"EGP"})}</div>
            </div>
            <div className="rounded-lg border border-amber-600/30 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
              <div className="text-amber-700 dark:text-amber-300">Projected Debt</div>
              <div className="font-semibold">{projectedDebt.toLocaleString(undefined,{style:"currency",currency:"EGP"})}</div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
          <input placeholder="New customer name" value={newCustomer.name} onChange={e => setNewCustomer(v => ({ ...v, name: e.target.value }))} className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
          <input placeholder="Email (optional)" value={newCustomer.email} onChange={e => setNewCustomer(v => ({ ...v, email: e.target.value }))} className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
          <input placeholder="Phone (optional)" value={newCustomer.phone} onChange={e => setNewCustomer(v => ({ ...v, phone: e.target.value }))} className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-12 gap-2 font-medium text-sm mb-1">
          <div className="col-span-5">Product</div>
          <div className="col-span-2">Capacity</div>
          <div className="col-span-2">Price (EGP)</div>
          <div className="col-span-2">Qty</div>
          <div className="col-span-1 text-right">Total</div>
        </div>
        {lines.map((l, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center py-1">
            <div className="col-span-5">
              <select value={l.productId} onChange={e => onProductChange(idx, e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2">
                <option value="">Select product…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 text-sm text-muted-foreground">{l.capacity || "—"}</div>
            <div className="col-span-2">
              <input type="number" min={0} value={l.price} onChange={e => updateLine(idx, { price: Number(e.target.value) })} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
            </div>
            <div className="col-span-2">
              <input type="number" min={1} value={l.quantity} onChange={e => updateLine(idx, { quantity: Number(e.target.value) })} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
            </div>
            <div className="col-span-1 text-right text-sm">{(l.price * (l.quantity || 0)).toLocaleString(undefined, { style: "currency", currency: "EGP" })}</div>
            <div className="col-span-12 text-right">
              {lines.length > 1 && (
                <button type="button" onClick={() => removeLine(idx)} className="text-xs text-red-600">Remove</button>
              )}
            </div>
          </div>
        ))}
        <div className="mt-2">
          <button type="button" onClick={addLine} className="rounded-md border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm">Add Line</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-end items-end">
        <div className="text-sm text-muted-foreground">Invoice Total</div>
        <div className="text-xl font-semibold">{totals.total.toLocaleString(undefined, { style: "currency", currency: "EGP" })}</div>
        <div className="text-sm text-muted-foreground">Balance</div>
        <div className="text-xl font-semibold">{totals.balance.toLocaleString(undefined, { style: "currency", currency: "EGP" })}</div>
      </div>

      <div className="flex gap-3 items-center">
        <button type="button" onClick={submitInvoice} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">Save Invoice</button>
        {submitStatus && <span className="text-sm text-emerald-600">{submitStatus}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
