"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [step, setStep] = useState<"request"|"verify">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [info, setInfo] = useState<string|null>(null);

  async function requestCode() {
    setLoading(true); setError(null); setInfo(null);
    try {
      const res = await fetch("/api/auth/register/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setInfo("تم إرسال كود التحقق إلى بريدك الإلكتروني.");
      setStep("verify");
    } catch (e:any) {
      setError(e.message || "فشل إرسال الكود");
    } finally { setLoading(false); }
  }

  async function complete() {
    setLoading(true); setError(null); setInfo(null);
    try {
      const res = await fetch("/api/auth/register/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, password, name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setInfo("تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول.");
    } catch (e:any) {
      setError(e.message || "فشل إكمال التسجيل");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6 text-center">تسجيل حساب جديد</h1>

      {step === "request" && (
        <div className="space-y-3">
          <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
          <button onClick={requestCode} disabled={!email || loading} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2">
            {loading ? "جارٍ الإرسال…" : "أرسل كود التحقق"}
          </button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {info && <div className="text-emerald-700 text-sm">{info}</div>}
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-3">
          <input type="text" placeholder="كود التحقق" value={code} onChange={e=>setCode(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
          <input type="text" placeholder="الاسم (اختياري)" value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2" />
          <button onClick={complete} disabled={!email || !code || !password || loading} className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">
            {loading ? "جارٍ الإكمال…" : "إكمال التسجيل"}
          </button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {info && <div className="text-emerald-700 text-sm">{info}</div>}
        </div>
      )}

      <div className="mt-6 text-center text-sm text-muted-foreground">
        لديك حساب؟ <a href="/api/auth/signin" className="underline">سجّل الدخول</a>
      </div>
    </div>
  );
}
