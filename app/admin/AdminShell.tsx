"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, CreditCard, ExternalLink, LayoutDashboard, LoaderCircle, LogOut, Menu, Receipt, ShieldCheck, X } from "lucide-react";
import { apiFetch, ENDPOINTS } from "@/app/lib/api";
import { cx } from "@/app/lib/utils";
import { useToast } from "@/app/components/ui/Toast";

const NAV = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "الاشتراكات", icon: Receipt },
  { href: "/admin/bookings", label: "الحجوزات", icon: CalendarCheck },
  { href: "/admin/payments", label: "المدفوعات", icon: CreditCard },
] as const;

export default function AdminShell({ title, sub, actions, children }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const logout = async () => {
    setLeaving(true);
    await apiFetch(ENDPOINTS.adminSession, { method: "DELETE" });
    toast({ kind: "info", title: "تم تسجيل الخروج" });
    router.replace("/admin/login");
    router.refresh();
  };

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = isActive(n.href, "exact" in n && n.exact);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
              active ? "bg-brand/15 text-white ring-1 ring-brand/40" : "text-white/55 hover:bg-white/5 hover:text-white",
            )}
          >
            <n.icon className={cx("h-4 w-4", active ? "text-brand-soft" : "text-white/40")} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* سايدبار — ديسكتوب */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-line bg-ink-2/80 p-4 backdrop-blur lg:flex">
        <Brand />
        <div className="mt-6 flex-1">{nav}</div>
        <SideFooter onLogout={logout} leaving={leaving} />
      </aside>

      {/* درج — موبايل */}
      {open && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="قائمة لوحة الإدارة">
          <button aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <aside className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col border-l border-line bg-ink-2 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-xl border border-line p-2 text-white/60 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 flex-1">{nav}</div>
            <SideFooter onLogout={logout} leaving={leaving} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button onClick={() => setOpen(true)} aria-label="فتح القائمة" className="rounded-xl border border-line p-2 text-white/60 transition hover:text-white lg:hidden">
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black sm:text-lg">{title}</h1>
              {sub && <p className="truncate text-[11px] text-white/45">{sub}</p>}
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/15 text-brand-soft ring-1 ring-brand/30">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[10px] font-black uppercase tracking-wider text-white/40">FitZone Pro</span>
        <span className="block text-sm font-black">لوحة الإدارة</span>
      </span>
    </Link>
  );
}

function SideFooter({ onLogout, leaving }: { onLogout: () => void; leaving: boolean }) {
  return (
    <div className="space-y-1 border-t border-line pt-3">
      <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white/55 transition hover:bg-white/5 hover:text-white">
        <ExternalLink className="h-4 w-4 text-white/40" />
        فتح الموقع
      </a>
      <button onClick={onLogout} disabled={leaving} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white/55 transition hover:bg-brand/10 hover:text-brand-soft disabled:opacity-50">
        {leaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 text-white/40" />}
        تسجيل الخروج
      </button>
    </div>
  );
}
