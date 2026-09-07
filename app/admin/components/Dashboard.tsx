"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { adminFetch } from "@/app/lib/admin-client";
import { can, ROLE_LABEL, type Permission } from "@/app/lib/auth/roles";
import type { PublicUser } from "@/app/lib/db/users";
import { cx, egp } from "@/app/lib/utils";
import SubscriptionsPanel from "./SubscriptionsPanel";
import BookingsPanel from "./BookingsPanel";
import UsersPanel from "./UsersPanel";
import AuditPanel from "./AuditPanel";
import AccountPanel from "./AccountPanel";

export type Stats = {
  scope: "own" | "all";
  subscriptions: { total: number; pending: number; active: number; frozen: number; cancelled: number; expired: number; revenue: number | null; byPlan: { plan: string; count: number }[] };
  bookings: { total: number; pending: number; confirmed: number; done: number };
  staff: { total: number; active: number; coaches: number } | null;
};

type TabId = "overview" | "subscriptions" | "bookings" | "users" | "audit" | "account";

export default function Dashboard({ user, permissions }: { user: PublicUser; permissions: Permission[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const has = useCallback((p: Permission) => permissions.includes(p), [permissions]);

  const notify = useCallback((kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  // التحميل جوه الإيفكت نفسه (من غير setState متزامن) — `reload` بيعيد التشغيل
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await adminFetch<Stats>("/api/admin/stats");
      if (!alive) return;
      if (res.ok && res.data) setStats(res.data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const refresh = useCallback(() => {
    setLoading(true);
    setReload((n) => n + 1);
  }, []);

  const tabs = useMemo(
    () =>
      (
        [
          { id: "overview", label: "نظرة عامة", icon: Activity, show: true },
          { id: "subscriptions", label: "الاشتراكات", icon: CreditCard, show: has("subscriptions:read") || has("subscriptions:read:own") },
          { id: "bookings", label: "الحجوزات", icon: CalendarCheck, show: has("bookings:read") || has("bookings:read:own") },
          { id: "users", label: "المستخدمون", icon: Users, show: has("users:read") },
          { id: "audit", label: "سجل العمليات", icon: ClipboardList, show: has("audit:read") },
          { id: "account", label: "حسابي", icon: KeyRound, show: true },
        ] as const
      ).filter((t) => t.show),
    [has],
  );

  async function logout() {
    await adminFetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* ============ الهيدر ============ */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-surface/70 p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-brand/15 text-brand-soft ring-1 ring-brand/30">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight">لوحة إدارة FitZone Pro</h1>
            <p className="text-sm text-white/55">
              {user.name} · <span className="font-bold text-gold">{ROLE_LABEL[user.role]}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm transition hover:border-white/30"
          >
            <RefreshCw className={cx("size-4", loading && "animate-spin")} />
            تحديث
          </button>
          <button
            onClick={() => void logout()}
            className="flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-3 py-2 text-sm font-bold text-brand-soft transition hover:bg-brand/20"
          >
            <LogOut className="size-4" />
            خروج
          </button>
        </div>
      </header>

      {user.mustChangePassword && tab !== "account" && (
        <button
          onClick={() => setTab("account")}
          className="mb-5 block w-full rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-right text-sm font-bold text-gold"
        >
          ⚠️ لازم تغيّر كلمة السر المؤقتة — اضغط هنا.
        </button>
      )}

      {/* ============ التبويبات ============ */}
      <nav className="no-bar mb-6 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
              tab === t.id ? "border-brand/50 bg-brand/15 text-white" : "border-line text-white/60 hover:text-white",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </nav>

      {toast && (
        <p
          className={cx(
            "mb-5 rounded-2xl border px-4 py-3 text-sm font-bold",
            toast.kind === "ok" ? "border-mint/40 bg-mint/10 text-mint" : "border-brand/40 bg-brand/10 text-brand-soft",
          )}
        >
          {toast.text}
        </p>
      )}

      {/* ============ المحتوى ============ */}
      {tab === "overview" && <Overview stats={stats} user={user} />}
      {tab === "subscriptions" && <SubscriptionsPanel user={user} permissions={permissions} notify={notify} onChanged={refresh} />}
      {tab === "bookings" && <BookingsPanel permissions={permissions} notify={notify} onChanged={refresh} />}
      {tab === "users" && <UsersPanel me={user} permissions={permissions} notify={notify} />}
      {tab === "audit" && <AuditPanel />}
      {tab === "account" && <AccountPanel user={user} notify={notify} />}
    </div>
  );
}

/* ================================ نظرة عامة ================================ */

function Overview({ stats, user }: { stats: Stats | null; user: PublicUser }) {
  if (!stats) return <p className="rounded-2xl border border-line bg-surface/60 p-6 text-white/60">بنحمّل الأرقام…</p>;

  const s = stats.subscriptions;
  const cards = [
    { label: stats.scope === "own" ? "أعضائي" : "كل الاشتراكات", value: s.total, tone: "text-white" },
    { label: "نشط", value: s.active, tone: "text-mint" },
    { label: "بانتظار الدفع", value: s.pending, tone: "text-gold" },
    { label: "مجمّد", value: s.frozen, tone: "text-gold" },
    { label: "ملغي", value: s.cancelled, tone: "text-brand-soft" },
    { label: "حجوزات مفتوحة", value: stats.bookings.pending, tone: "text-white" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-surface/60 p-4">
            <p className="text-xs text-white/50">{c.label}</p>
            <p className={cx("num mt-1 text-2xl font-black", c.tone)}>{c.value}</p>
          </div>
        ))}
      </div>

      {can(user.role, "revenue:read") && s.revenue !== null && (
        <div className="rounded-2xl border border-mint/30 bg-mint/10 p-5">
          <p className="text-sm text-white/70">إيراد الاشتراكات السارية</p>
          <p className="num mt-1 text-3xl font-black text-mint">{egp(s.revenue)}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface/60 p-5">
          <h2 className="mb-3 font-black">التوزيع على الباقات</h2>
          {s.byPlan.length === 0 ? (
            <p className="text-sm text-white/50">لسه مفيش اشتراكات.</p>
          ) : (
            <ul className="space-y-2">
              {s.byPlan.map((p) => (
                <li key={p.plan} className="flex items-center justify-between text-sm">
                  <span className="text-white/75">{p.plan}</span>
                  <span className="num font-black">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface/60 p-5">
          <h2 className="mb-3 font-black">الحجوزات</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-white/75">الكل</span><span className="num font-black">{stats.bookings.total}</span></li>
            <li className="flex justify-between"><span className="text-white/75">في الانتظار</span><span className="num font-black text-gold">{stats.bookings.pending}</span></li>
            <li className="flex justify-between"><span className="text-white/75">مؤكد</span><span className="num font-black text-mint">{stats.bookings.confirmed}</span></li>
            <li className="flex justify-between"><span className="text-white/75">تمت</span><span className="num font-black">{stats.bookings.done}</span></li>
          </ul>
          {stats.staff && (
            <p className="mt-4 border-t border-line pt-3 text-sm text-white/60">
              فريق العمل: <span className="num font-black text-white">{stats.staff.active}</span> نشط من{" "}
              <span className="num">{stats.staff.total}</span> — منهم <span className="num">{stats.staff.coaches}</span> كوتش
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
