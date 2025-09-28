"use client";

import { useEffect, useState } from "react";

export default function AdminImportPage() {
  const [managers, setManagers] = useState<{id:string;name:string|null;email:string|null;role?:string|null}[]>([]);
  const [managerId, setManagerId] = useState("");
  const [file, setFile] = useState<File|null>(null);
  const [wipe, setWipe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string|null>(null);
  const [fetchError, setFetchError] = useState<string|undefined>();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/managers", { cache: "no-store" });
        const json = await res.json();
        if (res.ok) {
          setManagers(json.managers || []);
          if ((json.managers||[]).length > 0) setManagerId(json.managers[0].id);
        } else {
          setFetchError(json?.error || `HTTP ${res.status}`);
        }
      } catch (e:any) {
        setFetchError(e?.message || "Failed to load users");
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      if (!file) throw new Error("اختر ملفًا أولًا");
      if (!managerId) throw new Error("اختر مديرًا");
      fd.append("file", file);
      fd.append("managerId", managerId);
      fd.append("wipe", String(wipe));
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const text = await res.text();
      let data: any = null; try { data = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
      setMessage(`تم الاستيراد بنجاح: ${data.created} صف`);
    } catch (e:any) {
      setMessage(e.message || "فشل الاستيراد");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">استيراد اليومية (Excel/CSV)</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">اختر المستخدم (سيُسجّل كبائع)</label>
          {managers.length > 0 ? (
            <select value={managerId} onChange={e=>setManagerId(e.target.value)} className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2">
              {managers.map(m => (
                <option key={m.id} value={m.id}>{(m.name || m.email || m.id)}{m.role?` — ${m.role}`:""}</option>
              ))}
            </select>
          ) : (
            <div className="space-y-2">
              {fetchError && <div className="text-sm text-red-600">تعذّر تحميل القائمة: {fetchError}</div>}
              <input
                placeholder="أدخل معرف المستخدم (id) كبائع"
                value={managerId}
                onChange={e=>setManagerId(e.target.value)}
                className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              />
              <div className="text-xs text-muted-foreground">تلميح: يمكنك فتح صفحة "Users" ونسخ معرف المستخدم من الرابط أو من أدوات الإدارة.</div>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">الملف</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={e=>setFile(e.currentTarget.files?.[0]||null)} />
        </div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={wipe} onChange={e=>setWipe(e.currentTarget.checked)} />
          <span className="text-sm">مسح كل المعاملات الحالية قبل الاستيراد (فواتير + قيود + عناصر)</span>
        </label>
        <div>
          <button disabled={loading || !file || !managerId} className="rounded bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-60">
            {loading ? "جارٍ الاستيراد…" : "تنفيذ الاستيراد"}
          </button>
        </div>
        {message && <div className="text-sm mt-2">{message}</div>}
      </form>
      <div className="mt-6 text-sm text-muted-foreground">
        صيغة الأعمدة المتوقعة بالترتيب (يمكن التعرّف تلقائيًا): الإجمالي، الكمية، السعر، الحجم، الصنف، اسم العميل، التاريخ. سيتم التعامل مع صفوف "تحصيل" كتحصيل مباشر بدون مديونية.
      </div>
    </div>
  );
}
