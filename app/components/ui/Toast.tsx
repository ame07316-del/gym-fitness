"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, CircleX, Info, TriangleAlert, X } from "lucide-react";
import { cx } from "@/app/lib/utils";

type Kind = "success" | "error" | "info" | "warn";
type Toast = { id: number; kind: Kind; title: string; body?: string };

const Ctx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

const META: Record<Kind, { icon: typeof Info; ring: string; bar: string; text: string }> = {
  success: { icon: CircleCheck, ring: "border-mint/40", bar: "bg-mint", text: "text-mint" },
  error: { icon: CircleX, ring: "border-brand/50", bar: "bg-brand", text: "text-brand-soft" },
  info: { icon: Info, ring: "border-white/15", bar: "bg-white/70", text: "text-white" },
  warn: { icon: TriangleAlert, ring: "border-gold/40", bar: "bg-gold", text: "text-gold" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => setItems((s) => s.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setItems((s) => [...s.slice(-3), { ...t, id }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:items-start"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const m = META[t.kind];
            return (
              <motion.div suppressHydrationWarning
                key={t.id}
                layout
                initial={{ opacity: 0, y: 26, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -40, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className={cx(
                  "pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border bg-surface/95 px-4 py-3 pr-12 shadow-2xl backdrop-blur",
                  m.ring,
                )}
              >
                <span className={cx("absolute inset-y-0 right-0 w-1", m.bar)} />
                <m.icon className={cx("absolute top-3.5 right-4 h-5 w-5", m.text)} />
                <p className="text-sm font-bold text-white">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs leading-relaxed text-white/60">{t.body}</p>}
                <button
                  onClick={() => remove(t.id)}
                  aria-label="إغلاق التنبيه"
                  className="absolute left-2 top-2 rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast should be used inside <ToastProvider>");
  return c.push;
}
