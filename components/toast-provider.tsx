"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number; // ms
};

type ToastContextType = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const duration = t.duration ?? 3000;
    const next: Toast = { id, ...t };
    setToasts((prev) => [...prev, next]);
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
  }, [remove]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 bottom-3 z-50 flex flex-col items-center gap-2 px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "w-full max-w-md rounded-lg border px-4 py-3 shadow-md text-sm",
              "backdrop-blur bg-white/90 dark:bg-zinc-900/80 border-black/10 dark:border-white/10",
              t.variant === "success" ? "border-emerald-200 text-emerald-900 dark:text-emerald-200" : "",
              t.variant === "error" ? "border-red-200 text-red-900 dark:text-red-200" : "",
              t.variant === "warning" ? "border-amber-200 text-amber-900 dark:text-amber-200" : "",
            ].join(" ")}
            role="status"
          >
            {t.title && <div className="font-medium mb-0.5">{t.title}</div>}
            {t.description && <div className="opacity-90">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
