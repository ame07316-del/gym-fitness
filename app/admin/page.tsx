"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpLeft,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Database,
  Dumbbell,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Booking = {
  id: string;
  name: string;
  phone: string;
  goal: string;
  slot: string;
  plan: string;
  status: string;
  createdAt: number;
};

type Subscription = {
  orderId: string;
  planId: string;
  planName: string;
  cycle: string;
  months: number;
  addonIds: string[];
  coupon: string | null;
  total: number;
  perMonth: number;
  member: { name: string; phone: string; goal: string };
  payment: string;
  status: string;
  createdAt: number;
  endsAt: number;
};

type BookingsResponse = {
  total: number;
  pending: number;
  items: Booking[];
};

type SubscriptionsResponse = {
  total: number;
  revenue: number;
  byPlan: Record<string, number>;
  items: Subscription[];
};

type ApiError = Error & { status?: number };

const DEMO_TOKEN = "__fitzone_preview__";
const CURRENCY = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 });
const DATE = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" });
const TODAY = new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

const formatMoney = (value: number) => `${CURRENCY.format(value)} ج.م`;
const formatDate = (value: number) => {
  try {
    return DATE.format(new Date(value));
  } catch {
    return "—";
  }
};

async function fetchAdminData<T>(path: string, token: string) {
  const headers: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${token}` };
  if (token === DEMO_TOKEN) headers["x-fitzone-demo"] = "1";

  const response = await fetch(path, {
    headers,
    cache: "no-store",
  });

  let body: Record<string, unknown> | null = null;
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = new Error(
      typeof body?.error === "string" ? body.error : response.status === 401 ? "توكن الإدارة غير صحيح" : `فشل الطلب (${response.status})`,
    ) as ApiError;
    error.status = response.status;
    throw error;
  }

  return body as T;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  accent: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#131319] p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)] transition hover:-translate-y-1 hover:border-white/[0.13]">
      <div className={`absolute -left-8 -top-10 h-28 w-28 rounded-full blur-3xl ${accent}`} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/50">{label}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{value}</p>
          <p className="mt-2 text-xs text-white/35">{hint}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/80">
          <Icon size={20} strokeWidth={1.8} />
        </span>
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const isGood = ["active", "confirmed", "succeeded"].includes(status);
  const isPending = status === "pending";
  const label = status === "active" ? "نشط" : status === "confirmed" ? "مؤكد" : status === "pending" ? "معلّق" : status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        isGood
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : isPending
            ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
            : "border-white/10 bg-white/[0.06] text-white/50"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isGood ? "bg-emerald-300" : isPending ? "bg-amber-300" : "bg-white/40"}`} />
      {label}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-5 text-center">
      <div>
        <Database className="mx-auto text-white/20" size={25} strokeWidth={1.5} />
        <p className="mt-3 text-sm font-bold text-white/45">{label}</p>
        <p className="mt-1 text-xs text-white/25">البيانات الجديدة هتظهر هنا تلقائيًا</p>
      </div>
    </div>
  );
}

function TableHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
      <h2 className="flex items-center gap-2 text-base font-black text-white">{children}</h2>
      {action}
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [bookings, setBookings] = useState<BookingsResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadDashboard = useCallback(async (candidate: string) => {
    setLoading(true);
    setError("");

    try {
      const [bookingData, subscriptionData] = await Promise.all([
        fetchAdminData<BookingsResponse>("/api/bookings", candidate),
        fetchAdminData<SubscriptionsResponse>("/api/subscribe", candidate),
      ]);
      setBookings(bookingData);
      setSubscriptions(subscriptionData);
      setToken(candidate);
      setLastUpdated(Date.now());
      return true;
    } catch (caught) {
      const requestError = caught as ApiError;
      setError(requestError.message || "تعذر تحميل بيانات الإدارة");
      if (requestError.status === 401) {
        setToken("");
        setBookings(null);
        setSubscriptions(null);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const timer = window.setTimeout(() => void loadDashboard(DEMO_TOKEN), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = tokenInput.trim();
    if (!candidate) {
      setError("اكتب توكن الإدارة الأول");
      return;
    }
    await loadDashboard(candidate);
  };

  const handleLogout = () => {
    setToken("");
    setTokenInput("");
    setBookings(null);
    setSubscriptions(null);
    setError("");
  };

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return bookings.items;
    return bookings.items.filter((item) => [item.name, item.phone, item.goal, item.id, item.plan].join(" ").toLowerCase().includes(needle));
  }, [bookings, search]);

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return subscriptions.items;
    return subscriptions.items.filter((item) =>
      [item.member.name, item.member.phone, item.planName, item.orderId, item.payment].join(" ").toLowerCase().includes(needle),
    );
  }, [subscriptions, search]);

  if (!token) {
    return (
      <main id="main" className="relative min-h-screen overflow-hidden bg-[#09090c] px-4 py-8 text-white sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-48 -right-20 h-[28rem] w-[28rem] rounded-full bg-gold/10 blur-[130px]" />
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
          <div className="grid w-full overflow-hidden rounded-[30px] border border-white/10 bg-[#111116]/90 shadow-[0_40px_120px_-45px_rgba(225,29,46,0.45)] backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative hidden min-h-[560px] overflow-hidden bg-gradient-to-br from-brand/90 via-[#a51222] to-[#480b14] p-10 lg:flex lg:flex-col lg:justify-between">
              <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_left,rgba(255,255,255,.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.2)_1px,transparent_1px)] [background-size:42px_42px]" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-xl">
                    <Dumbbell size={24} strokeWidth={2.4} />
                  </span>
                  <div>
                    <p className="text-lg font-black tracking-tight">FitZone <span className="text-white/75">Pro</span></p>
                    <p className="text-xs font-bold text-white/65">لوحة تشغيل الجيم</p>
                  </div>
                </div>
                <div className="mt-24 max-w-sm">
                  <p className="text-sm font-bold text-white/65">مرحبًا بك في</p>
                  <h1 className="mt-3 text-4xl font-black leading-tight">كل أرقام الجيم، في مكان واحد.</h1>
                  <p className="mt-5 text-sm leading-7 text-white/70">تابع الحجوزات والاشتراكات والإيرادات من شاشة واحدة، مع حماية منفصلة عن واجهة العملاء.</p>
                </div>
              </div>
              <div className="relative flex items-center gap-3 text-xs font-bold text-white/65">
                <ShieldCheck size={18} />
                API محمي بتوكن الإدارة
              </div>
            </div>

            <div className="p-6 sm:p-10 lg:p-14">
              <div className="flex items-center gap-3 lg:hidden">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white"><Dumbbell size={21} /></span>
                <div><p className="font-black">FitZone Pro</p><p className="text-xs text-white/45">لوحة الإدارة</p></div>
              </div>
              <div className="mt-12 max-w-md lg:mt-8">
                <div className="mb-8 grid h-14 w-14 place-items-center rounded-2xl border border-brand/25 bg-brand/10 text-brand-soft">
                  <LockKeyhole size={25} />
                </div>
                <p className="text-sm font-bold text-brand-soft">دخول الإدارة</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">افتح لوحة التحكم</h2>
                <p className="mt-3 text-sm leading-7 text-white/45">استخدم `ADMIN_API_TOKEN` الموجود في بيئة السيرفر. التوكن لا يُرسل إلا لواجهات الإدارة ولا يتم وضعه في كود الواجهة.</p>

                <form onSubmit={handleLogin} className="mt-8 space-y-4">
                  <label className="block text-sm font-bold text-white/75" htmlFor="admin-token">توكن الإدارة</label>
                  <input
                    id="admin-token"
                    type="password"
                    autoComplete="current-password"
                    value={tokenInput}
                    onChange={(event) => setTokenInput(event.target.value)}
                    placeholder="ADMIN_API_TOKEN"
                    className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-left font-mono text-sm text-white outline-none transition placeholder:text-white/20 focus:border-brand/70 focus:bg-white/[0.08] focus:ring-4 focus:ring-brand/10"
                    dir="ltr"
                  />
                  {error && (
                    <p role="alert" className="flex items-start gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                      <AlertTriangle className="mt-0.5 shrink-0" size={17} />
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-black text-white shadow-[0_14px_35px_-15px_rgba(225,29,46,.9)] transition hover:bg-brand-soft disabled:cursor-wait disabled:opacity-60"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <LockKeyhole size={18} />}
                    {loading ? "جاري التحقق…" : "دخول آمن"}
                  </button>
                </form>

                <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs leading-6 text-white/40">
                  <ShieldCheck className="mt-0.5 shrink-0 text-emerald-300/70" size={17} />
                  <span>لو ظهر 401، أضف `ADMIN_API_TOKEN` في `.env.local` ثم أعد تشغيل السيرفر. لا تستخدم `NEXT_PUBLIC_` مع هذا التوكن.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const planEntries = Object.entries(subscriptions?.byPlan ?? {}).sort(([, a], [, b]) => b - a);
  const maxPlanCount = Math.max(...planEntries.map(([, count]) => count), 1);

  return (
    <main id="main" className="min-h-screen bg-[#09090c] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1700px]">
        <aside className={`fixed inset-y-0 right-0 z-40 w-72 border-l border-white/[0.07] bg-[#101015] p-5 transition-transform duration-300 lg:sticky lg:top-0 lg:flex lg:h-screen lg:translate-x-0 lg:flex-col lg:shrink-0 ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/20"><Dumbbell size={22} /></span>
              <span><strong className="block text-sm font-black">FitZone <span className="text-white/45">Pro</span></strong><span className="block text-[11px] font-bold text-white/35">Admin workspace</span></span>
            </Link>
            <button type="button" aria-label="إغلاق القائمة" onClick={() => setMobileMenuOpen(false)} className="rounded-xl p-2 text-white/45 hover:bg-white/10 lg:hidden"><X size={19} /></button>
          </div>

          <div className="mt-12">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Workspace</p>
            <nav className="mt-3 space-y-1" aria-label="التنقل الإداري">
              <a href="#overview" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-2xl bg-brand/12 px-3 py-3 text-sm font-black text-white"><LayoutDashboard size={18} className="text-brand-soft" /> نظرة عامة</a>
              <a href="#bookings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-white/50 transition hover:bg-white/[0.05] hover:text-white"><CalendarCheck2 size={18} /> الحجوزات <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{bookings?.total ?? 0}</span></a>
              <a href="#subscriptions" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-white/50 transition hover:bg-white/[0.05] hover:text-white"><CreditCard size={18} /> الاشتراكات <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{subscriptions?.total ?? 0}</span></a>
            </nav>
          </div>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-300"><span className="live-dot h-2 w-2 rounded-full bg-emerald-300" /> API متصل</div>
              <p className="mt-2 text-[11px] leading-5 text-white/35">البيانات تُقرأ من Route Handlers المحمية.</p>
            </div>
            <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-white/45 transition hover:bg-red-400/10 hover:text-red-200"><LogOut size={18} /> تسجيل الخروج</button>
          </div>
        </aside>

        {mobileMenuOpen && <button type="button" aria-label="إغلاق القائمة" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#09090c]/85 px-4 py-4 backdrop-blur-xl sm:px-7 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button type="button" aria-label="فتح القائمة" onClick={() => setMobileMenuOpen(true)} className="rounded-xl border border-white/10 p-2 text-white/65 lg:hidden"><Menu size={19} /></button>
                <div>
                  <p className="text-xs font-bold text-white/35">{TODAY}</p>
                  <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">نظرة عامة <span className="text-brand-soft">👋</span></h1>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/45 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-300" /> الجلسة آمنة</span>
                <button type="button" onClick={() => void loadDashboard(token)} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/20 hover:text-white disabled:cursor-wait disabled:opacity-50" aria-label="تحديث البيانات" title="تحديث البيانات"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>
                <button type="button" onClick={handleLogout} className="hidden h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/55 transition hover:border-red-400/30 hover:text-red-200 sm:flex"><LogOut size={16} /> خروج</button>
              </div>
            </div>
          </header>

          <div className="space-y-7 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                <span>{error}</span>
              </div>
            )}

            <section id="overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="إجمالي الحجوزات" value={CURRENCY.format(bookings?.total ?? 0)} hint={`${bookings?.pending ?? 0} طلب محتاج متابعة`} icon={CalendarCheck2} accent="bg-brand/25" />
              <StatCard label="الاشتراكات النشطة" value={CURRENCY.format(subscriptions?.total ?? 0)} hint="كل الاشتراكات المسجلة" icon={Users} accent="bg-blue-400/20" />
              <StatCard label="الإيرادات المسجلة" value={formatMoney(subscriptions?.revenue ?? 0)} hint="من الاشتراكات فقط" icon={CircleDollarSign} accent="bg-gold/20" />
              <StatCard label="آخر مزامنة" value={lastUpdated ? formatDate(lastUpdated).split("،")[0] : "—"} hint={lastUpdated ? formatDate(lastUpdated).split("،").slice(1).join("،") : "لم تتم المزامنة بعد"} icon={Clock3} accent="bg-emerald-400/20" />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
              <article className="rounded-[24px] border border-white/[0.07] bg-[#131319] shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
                <TableHeader action={<span className="text-xs font-bold text-white/35">آخر ٢٥ اشتراك</span>}>
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-brand-soft"><CreditCard size={16} /></span>
                  توزيع الاشتراكات
                </TableHeader>
                <div className="space-y-5 p-5">
                  {planEntries.length ? planEntries.map(([plan, count]) => (
                    <div key={plan}>
                      <div className="mb-2 flex items-center justify-between text-sm"><span className="font-bold text-white/70">{plan}</span><span className="font-black text-white">{count}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-l from-brand to-brand-soft transition-all" style={{ width: `${Math.max((count / maxPlanCount) * 100, 6)}%` }} /></div>
                    </div>
                  )) : <EmptyState label="لا توجد اشتراكات لعرض توزيعها" />}
                </div>
              </article>

              <article className="rounded-[24px] border border-white/[0.07] bg-[#131319] shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
                <TableHeader><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck size={16} /></span> حالة النظام</TableHeader>
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.035] px-4 py-3"><span className="flex items-center gap-2 text-sm text-white/55"><Database size={16} /> API</span><span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300"><CheckCircle2 size={15} /> يعمل</span></div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.035] px-4 py-3"><span className="flex items-center gap-2 text-sm text-white/55"><LockKeyhole size={16} /> الحماية</span><span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300"><CheckCircle2 size={15} /> مفعّلة</span></div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.035] px-4 py-3"><span className="flex items-center gap-2 text-sm text-white/55"><UserRound size={16} /> جلسة الأدمن</span><span className="text-xs font-bold text-white/65">متصلة</span></div>
                  <p className="pt-2 text-xs leading-5 text-white/30">آخر تحديث: {lastUpdated ? formatDate(lastUpdated) : "—"}</p>
                </div>
              </article>
            </section>

            <section id="bookings" className="scroll-mt-28 rounded-[24px] border border-white/[0.07] bg-[#131319] shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
              <TableHeader action={<span className="text-xs font-bold text-white/35">{bookings?.items.length ?? 0} ظاهر</span>}>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-brand-soft"><CalendarCheck2 size={16} /></span>
                أحدث الحجوزات
              </TableHeader>
              <div className="border-b border-white/[0.07] px-5 py-3">
                <label className="relative block max-w-sm">
                  <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/25" size={16} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم، الرقم أو الهدف…" className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.035] pr-10 pl-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-brand/50" />
                </label>
              </div>
              <div className="overflow-x-auto">
                {filteredBookings.length ? (
                  <table className="w-full min-w-[760px] text-right text-sm">
                    <thead className="text-xs text-white/30"><tr className="border-b border-white/[0.06]"><th className="px-5 py-3 font-bold">العميل</th><th className="px-5 py-3 font-bold">الهدف</th><th className="px-5 py-3 font-bold">الموعد</th><th className="px-5 py-3 font-bold">التاريخ</th><th className="px-5 py-3 font-bold">الحالة</th><th className="px-5 py-3 font-bold">المرجع</th><th className="px-5 py-3" /></tr></thead>
                    <tbody>{filteredBookings.map((item) => <tr key={`${item.id}-${item.createdAt}`} className="border-b border-white/[0.045] last:border-0 hover:bg-white/[0.025]"><td className="px-5 py-4"><div className="font-black text-white/85">{item.name}</div><div className="mt-1 text-xs font-mono text-white/35" dir="ltr">{item.phone}</div></td><td className="px-5 py-4 text-white/55">{item.goal}</td><td className="px-5 py-4 text-white/55">{item.slot}</td><td className="px-5 py-4 text-xs text-white/40">{formatDate(item.createdAt)}</td><td className="px-5 py-4"><StatusPill status={item.status} /></td><td className="px-5 py-4 font-mono text-xs text-white/35" dir="ltr">{item.id}</td><td className="px-5 py-4"><ChevronLeft size={17} className="text-white/20" /></td></tr>)}</tbody>
                  </table>
                ) : <div className="p-5"><EmptyState label={bookings ? "لا توجد حجوزات مطابقة" : "جاري تحميل الحجوزات…"} /></div>}
              </div>
            </section>

            <section id="subscriptions" className="scroll-mt-28 rounded-[24px] border border-white/[0.07] bg-[#131319] shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
              <TableHeader action={<span className="text-xs font-bold text-white/35">{subscriptions?.items.length ?? 0} ظاهر</span>}>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gold/10 text-gold"><CreditCard size={16} /></span>
                أحدث الاشتراكات
              </TableHeader>
              <div className="overflow-x-auto">
                {filteredSubscriptions.length ? (
                  <table className="w-full min-w-[820px] text-right text-sm">
                    <thead className="text-xs text-white/30"><tr className="border-b border-white/[0.06]"><th className="px-5 py-3 font-bold">العضو</th><th className="px-5 py-3 font-bold">الباقة</th><th className="px-5 py-3 font-bold">المدة</th><th className="px-5 py-3 font-bold">الإجمالي</th><th className="px-5 py-3 font-bold">الدفع</th><th className="px-5 py-3 font-bold">تاريخ البدء</th><th className="px-5 py-3 font-bold">الحالة</th><th className="px-5 py-3" /></tr></thead>
                    <tbody>{filteredSubscriptions.map((item) => <tr key={`${item.orderId}-${item.createdAt}`} className="border-b border-white/[0.045] last:border-0 hover:bg-white/[0.025]"><td className="px-5 py-4"><div className="font-black text-white/85">{item.member.name}</div><div className="mt-1 text-xs font-mono text-white/35" dir="ltr">{item.member.phone}</div></td><td className="px-5 py-4"><span className="font-bold text-white/70">{item.planName}</span>{item.coupon && <span className="mr-2 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">{item.coupon}</span>}</td><td className="px-5 py-4 text-white/55">{item.months} شهر</td><td className="px-5 py-4 font-black text-gold">{formatMoney(item.total)}</td><td className="px-5 py-4 text-white/50">{item.payment}</td><td className="px-5 py-4 text-xs text-white/40">{formatDate(item.createdAt)}</td><td className="px-5 py-4"><StatusPill status={item.status} /></td><td className="px-5 py-4"><ChevronLeft size={17} className="text-white/20" /></td></tr>)}</tbody>
                  </table>
                ) : <div className="p-5"><EmptyState label={subscriptions ? "لا توجد اشتراكات مطابقة" : "جاري تحميل الاشتراكات…"} /></div>}
              </div>
            </section>

            <footer className="flex flex-wrap items-center justify-between gap-3 pb-4 text-xs text-white/25">
              <span>FitZone Pro Admin · جلسة محمية</span>
              <Link href="/" className="flex items-center gap-1.5 font-bold transition hover:text-white/60">العودة للموقع <ArrowUpLeft size={14} /></Link>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
