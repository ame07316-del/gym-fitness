"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cx } from "@/app/lib/utils";

/** نافذة منبثقة: Esc + قفل السكرول + backdrop click + تركيز أول عنصر */
export function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" } as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div suppressHydrationWarning
          className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : "نافذة"}
        >
          <motion.div suppressHydrationWarning
            className="absolute inset-0 bg-black/78 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div suppressHydrationWarning
            initial={{ opacity: 0, y: 44, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cx(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-ink-2 shadow-[0_40px_120px_-40px_rgba(0,0,0,.9)] sm:rounded-3xl",
              sizes[size],
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line bg-surface/60 px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-white">{title}</h3>
                {sub && <div className="mt-0.5 text-xs text-white/50">{sub}</div>}
              </div>
              <button
                onClick={onClose}
                aria-label="إغلاق"
                className="shrink-0 rounded-xl border border-line bg-white/5 p-2 text-white/60 transition hover:border-brand/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="no-bar flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="border-t border-line bg-surface/70 px-5 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** درج جانبي (لوحة العضوية) */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div suppressHydrationWarning className="fixed inset-0 z-[112]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div suppressHydrationWarning className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.aside suppressHydrationWarning
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-ink-2 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-lg font-black">{title}</h3>
              <button
                onClick={onClose}
                aria-label="إغلاق اللوحة"
                className="rounded-xl border border-line bg-white/5 p-2 text-white/60 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="no-bar flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
