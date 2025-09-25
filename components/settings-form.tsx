"use client";

import { useEffect, useState } from "react";

export default function SettingsForm() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [background, setBackground] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/media", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setLogo(data.logo || null);
      setBackground(data.background || null);
    } catch (e: any) {
      setError(e.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onUpload(kind: "LOGO" | "BACKGROUND", file: File) {
    setError(null);
    setSaving(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData?.error || `Upload HTTP ${up.status}`);
      const url: string = upData.url;
      const set = await fetch("/api/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, url }) });
      const setData = await set.json();
      if (!set.ok) throw new Error(setData?.error || `Media HTTP ${set.status}`);
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900">
            <h2 className="font-medium mb-3">Logo</h2>
            <div className="mb-3">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Logo" className="h-16 object-contain" />
              ) : (
                <div className="text-sm text-muted-foreground">No logo set</div>
              )}
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/10">
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.currentTarget.files?.[0]; if(f) onUpload("LOGO", f); e.currentTarget.value=""; }} />
              {saving==="LOGO" ? "Saving…" : "Upload Logo"}
            </label>
          </div>

          <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900">
            <h2 className="font-medium mb-3">Background</h2>
            <div className="mb-3">
              {background ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={background} alt="Background" className="h-24 w-full object-cover rounded" />
              ) : (
                <div className="text-sm text-muted-foreground">No background set</div>
              )}
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/10">
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.currentTarget.files?.[0]; if(f) onUpload("BACKGROUND", f); e.currentTarget.value=""; }} />
              {saving==="BACKGROUND" ? "Saving…" : "Upload Background"}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
