"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Inbox, LoaderCircle, type LucideIcon } from "lucide-react";
import { cx } from "@/app/lib/utils";

/* ---------- كارت رقم ---------- */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  delta,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: "neutral" | "brand" | "mint" | "gold";
  delta?: number | null;
  delay?: number;
}) {
  const tones = {
    neutral: "bg-white/5 text-white/70 ring-white/10",
    brand: "bg-brand/15 text-brand-soft ring-brand/30",
    mint: "bg-mint/12 text-mint ring-mint/30",
    gold: "bg-gold/12 text-gold ring-gold/30",
  } as const;
  return (
    <motion.div
      suppressHydrationWarning
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-line bg-surface/70 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-white/45">{label}</p>
          <p className="num mt-2 text-2xl font-black leading-none text-white sm:text-[1.7rem]">{value}</p>
          {(hint || delta != null) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
              {delta != null && (
                <span className={cx("inline-flex items-center gap-0.5 font-black", delta >= 0 ? "text-mint" : "text-brand-soft")}>
                  {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span className="num">{Math.abs(delta)}%</span>
                </span>
              )}
              {hint && <span>{hint}</span>}
            </div>
          )}
        </div>
        <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </motion.div>
  );
}

/* ---------- كارت قسم ---------- */
export function Panel({
  title,
  sub,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("overflow-hidden rounded-2xl border border-line bg-surface/60", className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-white">{title}</h2>
          {sub && <p className="mt-0.5 text-[11px] text-white/45">{sub}</p>}
        </div>
        {action}
      </header>
      <div className={cx("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ---------- شارة حالة ---------- */
const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "نشط", cls: "border-mint/35 bg-mint/12 text-mint" },
  confirmed: { label: "مؤكد", cls: "border-mint/35 bg-mint/12 text-mint" },
  succeeded: { label: "ناجحة", cls: "border-mint/35 bg-mint/12 text-mint" },
  pending: { label: "قيد المراجعة", cls: "border-gold/35 bg-gold/12 text-gold" },
  requires_action: { label: "بانتظار OTP", cls: "border-gold/35 bg-gold/12 text-gold" },
  frozen: { label: "مجمّد", cls: "border-sky-400/35 bg-sky-400/12 text-sky-300" },
  failed: { label: "مرفوضة", cls: "border-brand/40 bg-brand/15 text-brand-soft" },
  cancelled: { label: "ملغي", cls: "border-white/15 bg-white/5 text-white/60" },
  expired: { label: "منتهي", cls: "border-white/15 bg-white/5 text-white/60" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "border-white/15 bg-white/5 text-white/60" };
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-black", s.cls)}>{s.label}</span>;
}

/* ---------- جدول ---------- */
export type Column<T> = { key: string; title: React.ReactNode; render: (row: T) => React.ReactNode; className?: string; hideOnMobile?: boolean };

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty = "مفيش بيانات لسه",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: React.ReactNode;
}) {
  return (
    <div className="no-bar relative -mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-right text-xs">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cx(
                  "sticky top-0 z-10 border-b border-line bg-surface px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/45 first:rounded-tr-xl last:rounded-tl-xl",
                  c.hideOnMobile && "hidden md:table-cell",
                  c.className,
                )}
              >
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-12 text-center text-white/40">
                <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-12 text-center text-white/40">
                <Inbox className="mx-auto mb-2 h-6 w-6 text-white/25" />
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={rowKey(r)} className="group transition hover:bg-white/[.03]">
              {columns.map((c) => (
                <td key={c.key} className={cx("border-b border-line/50 px-3 py-2.5 align-middle text-white/80", c.hideOnMobile && "hidden md:table-cell", c.className)}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- ترقيم صفحات ---------- */
export function Pager({ page, pages, total, per, onPage }: { page: number; pages: number; total: number; per: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  const from = (page - 1) * per + 1;
  const to = Math.min(total, page * per);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/45">
      <span>
        عرض <span className="num text-white/80">{from}–{to}</span> من <span className="num text-white/80">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="rounded-lg border border-line px-2.5 py-1 font-bold transition hover:bg-white/5 disabled:opacity-35">
          السابق
        </button>
        <span className="num px-2 text-white/70">
          {page} / {pages}
        </span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="rounded-lg border border-line px-2.5 py-1 font-bold transition hover:bg-white/5 disabled:opacity-35">
          التالي
        </button>
      </div>
    </div>
  );
}

/* ---------- شريط توزيع (نِسب أفقية) ---------- */
export function Bars({ items, tone = "brand", format }: { items: { label: string; value: number; sub?: string }[]; tone?: "brand" | "mint" | "gold"; format?: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  const fill = { brand: "bg-brand", mint: "bg-mint", gold: "bg-gold" }[tone];
  if (items.length === 0 || total === 0) return <Empty />;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
            <span className="truncate font-bold text-white/80">{i.label}</span>
            <span className="num shrink-0 text-white/50">
              {format ? format(i.value) : i.value}
              {total > 0 && <span className="text-white/30"> · {Math.round((i.value / total) * 100)}%</span>}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]">
            <motion.div suppressHydrationWarning initial={{ width: 0 }} animate={{ width: `${(i.value / max) * 100}%` }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className={cx("h-full rounded-full", fill)} />
          </div>
          {i.sub && <p className="mt-0.5 text-[10px] text-white/35">{i.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ---------- أعمدة آخر 7 أيام ---------- */
export function DailyChart({ data }: { data: { day: string; revenue: number; orders: number; bookings: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const any = data.some((d) => d.revenue > 0 || d.orders > 0 || d.bookings > 0);
  if (!any) return <Empty text="مفيش حركة في آخر 7 أيام — اعمل اشتراك أو حجز من الموقع وهيظهر هنا" />;
  return (
    <div className="flex h-44 items-end gap-2 sm:gap-3">
      {data.map((d, i) => (
        <div key={d.day} className="group flex flex-1 flex-col items-center gap-1.5">
          <span className="num text-[10px] font-black text-white/60 opacity-0 transition group-hover:opacity-100">{d.revenue ? d.revenue.toLocaleString("en-US") : ""}</span>
          <div className="flex w-full flex-1 items-end justify-center">
            <motion.div
              suppressHydrationWarning
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(d.revenue > 0 ? 6 : 2, (d.revenue / max) * 100)}%` }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className={cx("w-full max-w-10 rounded-t-lg", d.revenue > 0 ? "bg-gradient-to-t from-brand-dark to-brand-soft" : "bg-white/[.06]")}
              title={`${d.day}: ${d.revenue.toLocaleString("en-US")} ج.م · ${d.orders} اشتراك · ${d.bookings} حجز`}
            />
          </div>
          <span className="text-[10px] text-white/45">{d.day}</span>
          <span className="num text-[10px] text-white/30">
            {d.orders}/{d.bookings}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Empty({ text = "مفيش بيانات لسه" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line/80 px-4 py-8 text-center text-xs text-white/40">
      <Inbox className="h-5 w-5 text-white/25" />
      <p className="max-w-xs leading-relaxed">{text}</p>
    </div>
  );
}

/* ---------- شريط أدوات القوائم ---------- */
export const inputCls = "w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm outline-none transition placeholder:text-white/25 focus:border-brand/70";

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="no-bar flex gap-1 overflow-x-auto rounded-xl border border-line bg-ink p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-black transition",
            value === o.id ? "bg-brand text-white shadow-[0_8px_24px_-12px_rgba(225,29,46,.9)]" : "text-white/55 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
