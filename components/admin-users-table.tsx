"use client";

import { useState } from "react";

function formatName(u: { name: string | null; username: string | null }) {
  return u.name || u.username || "—";
}

function formatVal(v: string | null | undefined) {
  return v || "—";
}

export default function AdminUsersTable({
  requesters,
  employees,
}: {
  requesters: { id: string; name: string | null; username: string | null; email: string | null; phone: string | null }[];
  employees: { id: string; name: string | null; username: string | null; email: string | null; phone: string | null }[];
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-semibold mb-3">Pending Customers</h2>
        {requesters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending customers.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/5 dark:bg-white/10">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Username</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-right p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {requesters.map((u) => (
                  <Row key={u.id} user={u} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Representatives</h2>
        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No representatives yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/5 dark:bg-white/10">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Username</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-right p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((u) => (
                  <EmployeeRow key={u.id} user={u} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ user }: { user: { id: string; name: string | null; username: string | null; email: string | null; phone: string | null } }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: "EMPLOYEE" }),
      });
      const raw = await res.text();
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch {}
      if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) return null;

  return (
    <tr className="border-t border-black/10 dark:border-white/10">
      <td className="p-3">{formatName(user)}</td>
      <td className="p-3">{formatVal(user.username)}</td>
      <td className="p-3">{formatVal(user.email)}</td>
      <td className="p-3">{formatVal(user.phone)}</td>
      <td className="p-3 text-right">
        <button onClick={approve} disabled={loading} className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs disabled:opacity-60">
          {loading ? "Approving…" : "Approve as Representative"}
        </button>
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </td>
    </tr>
  );
}

function EmployeeRow({ user }: { user: { id: string; name: string | null; username: string | null; email: string | null; phone: string | null } }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revertToCustomer() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: "REQUESTER" }),
      });
      const raw = await res.text();
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch {}
      if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) return null;

  return (
    <tr className="border-t border-black/10 dark:border-white/10">
      <td className="p-3">{formatName(user)}</td>
      <td className="p-3">{formatVal(user.username)}</td>
      <td className="p-3">{formatVal(user.email)}</td>
      <td className="p-3">{formatVal(user.phone)}</td>
      <td className="p-3 text-right">
        <button onClick={revertToCustomer} disabled={loading} className="rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-xs disabled:opacity-60">
          {loading ? "Updating…" : "Revert to Customer"}
        </button>
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </td>
    </tr>
  );
}
