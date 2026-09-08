"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, CalendarCheck, CreditCard, Database, FlaskConical, LoaderCircle, Receipt, RefreshCw, ShieldAlert, Trash2, TrendingUp, Users, Wallet } from "lucide-react";
import AdminShell from "./AdminShell";
import { Bars, DailyChart, Empty, Panel, Stat } from "./ui";
import { useAdminData } from "./use-admin";
import type { AdminOverview } from "@/app/lib/server/admin-stats";

/** `/api/admin/overview` بيزوّد `storage` فوق شكل `AdminOverview` — التخزين الشغال دلوقتي */
type OverviewResponse = AdminOverview & { storage?: { kind: "memory" | "postgres"; label: string } };
import { apiFetch, ENDPOINTS } from "@/app/lib/api";
import { CYCLES, PAY_METHODS } from "@/app/lib/data";
import { egp } from "@/app/lib/utils";
import { useToast } from "@/app/components/ui/Toast";
import { useHydrated } from "@/app/lib/storage";

const cycleLabel = (id: string) => CYCLES.find((c) => c.id === id)?.label ?? id;
const payLabel = (id: string) => PAY_METHODS.find((p) => p.id === id)?.label ?? id;
const BRAND_LABEL: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", mada: "mada", unknown: "غير معروف" };
const DECLINE_LABEL: Record<string, string> = {
  card_declined: "رفض البنك",
  insufficient_funds: "رصيد غير كافٍ",
  expired_card: "كارت منتهي",
  incorrect_cvc: "CVV غلط",
  invalid_number: "رقم غير صحيح (Luhn)",
};

const fmtTime = (ts: number) => new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit" }).format(new Date(ts));

export default function Overview() {
  const { data, error, loading, updatedAt, reload } = useAdminData<OverviewResponse>(ENDPOINTS.adminOverview, { refreshMs: 30_000 });
  const toast = useToast();
  const hydrated = useHydrated();
  const [wiping, setWiping] = useState(false);

  const onDb = data?.storage?.kind === "postgres";

  const wipe = async () => {
    const where = onDb ? `من الداتابيز (${data?.storage?.label}) — الصفوف بتتمسح فعلًا` : "من ذاكرة السيرفر";
    if (!window.confirm(`هتمسح كل الاشتراكات والحجوزات والمدفوعات ${where}. متأكد؟`)) return;
    setWiping(true);
    const res = await apiFetch(ENDPOINTS.adminReset, { method: "POST" });
    setWiping(false);
    if (res.ok) {
      toast({ kind: "success", title: "اتمسحت بيانات التجربة" });
      reload();
    } else toast({ kind: "error", title: "المسح فشل", body: res.error ?? undefined });
  };

  const d = data;

  return (
    <AdminShell
      title="نظرة عامة"
      sub={hydrated && updatedAt ? `آخر تحديث ${fmtTime(updatedAt)} · بيتحدث كل 30 ثانية` : "إحصائيات حية من السيرفر"}
      actions={
        <>
          <button onClick={reload} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/5 px-3 py-2 text-xs font-bold text-white/70 transition hover:border-brand/50 hover:text-white">
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
          {d?.sandbox && (
            <button onClick={wipe} disabled={wiping} className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-xs font-bold text-brand-soft transition hover:bg-brand/20 disabled:opacity-50">
              {wiping ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">مسح بيانات التجربة</span>
            </button>
          )}
        </>
      }
    >
      {error && !d && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand-soft">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* التخزين الشغال: داتابيز حقيقية ولا ذاكرة */}
      {d &&
        (onDb ? (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-mint/30 bg-mint/10 px-4 py-2.5 text-[11px] leading-relaxed text-mint">
            <span className="inline-flex items-center gap-1.5 font-black">
              <Database className="h-3.5 w-3.5" /> متوصّل بداتابيز
            </span>
            <span className="text-mint/80">
              <span className="num">{d.storage?.label}</span> — الحجوزات والاشتراكات والمدفوعات محفوظة وبتفضل بعد إعادة التشغيل والـ deploy.
              {d.sandbox ? " (بوابة الدفع لسه وضع تجربة — مفيش فلوس بتتحرك.)" : ""}
            </span>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-[11px] leading-relaxed text-gold">
            <span className="inline-flex items-center gap-1.5 font-black">
              <FlaskConical className="h-3.5 w-3.5" /> وضع التجربة
            </span>
            <span className="text-gold/80">
              التخزين in-memory — البيانات بتتصفر مع كل إعادة تشغيل للسيرفر (شغال من {hydrated ? fmtTime(d.bootedAt) : "…"}). عايز تخزين دايم؟ حط{" "}
              <span className="num">DATABASE_URL</span> وشغّل <span className="num">npm run db:migrate</span>.
            </span>
          </div>
        ))}

      {/* أرقام رئيسية */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="إجمالي الإيراد" value={d ? egp(d.revenue.total) : "—"} hint={d ? `النهارده ${egp(d.revenue.today)}` : undefined} icon={Banknote} tone="brand" />
        <Stat label="الاشتراكات" value={d ? d.orders.total : "—"} hint={d ? `${d.orders.active} نشط · النهارده ${d.orders.today}` : undefined} icon={Receipt} tone="mint" delay={0.05} />
        <Stat label="طلبات الحجز" value={d ? d.bookings.total : "—"} hint={d ? `النهارده ${d.bookings.today}` : undefined} icon={CalendarCheck} tone="gold" delay={0.1} />
        <Stat
          label="عمليات الدفع"
          value={d ? d.payments.total : "—"}
          hint={d ? `${d.payments.succeeded} ناجحة · ${d.payments.failed} مرفوضة · ${d.payments.requiresAction} معلّقة` : undefined}
          icon={CreditCard}
          delay={0.15}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="متوسط الطلب" value={d ? egp(d.revenue.avgOrder) : "—"} icon={TrendingUp} delay={0.2} />
        <Stat label="إيراد آخر 7 أيام" value={d ? egp(d.revenue.week) : "—"} icon={Wallet} delay={0.25} />
        <Stat label="ض.ق.م المحصّلة (14%)" value={d ? egp(d.revenue.vat) : "—"} hint="من الإجمالي الشامل" icon={Database} delay={0.3} />
        <Stat label="حجم الدفع الناجح" value={d ? egp(d.payments.volume) : "—"} hint="بوابة الدفع" icon={Users} delay={0.35} />
      </div>

      {/* الرسم اليومي + الباقات */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="آخر 7 أيام" sub="الإيراد لكل يوم — وتحت كل عمود: اشتراكات/حجوزات" className="xl:col-span-2">
          {d ? <DailyChart data={d.daily} /> : <Skeleton h="h-44" />}
        </Panel>

        <Panel title="توزيع الباقات" sub="عدد الاشتراكات والإيراد لكل باقة">
          {d ? (
            <Bars
              tone="brand"
              items={d.orders.byPlan.filter((p) => p.count > 0).map((p) => ({ label: p.name, value: p.count, sub: egp(p.revenue) }))}
            />
          ) : (
            <Skeleton />
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="مدة الاشتراك">
          {d ? <Bars tone="mint" items={Object.entries(d.orders.byCycle).map(([k, v]) => ({ label: cycleLabel(k), value: v }))} /> : <Skeleton />}
        </Panel>
        <Panel title="طرق الدفع">
          {d ? <Bars tone="gold" items={Object.entries(d.orders.byPayment).map(([k, v]) => ({ label: payLabel(k), value: v }))} /> : <Skeleton />}
        </Panel>
        <Panel title="الإضافات الأكثر طلبًا">
          {d ? <Bars tone="brand" items={d.orders.addons.map((a) => ({ label: a.name, value: a.count }))} /> : <Skeleton />}
        </Panel>
        <Panel title="أكواد الخصم المستخدمة">
          {d ? <Bars tone="mint" items={d.orders.coupons.map((c) => ({ label: c.code, value: c.count }))} /> : <Skeleton />}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="أهداف المتدربين" sub="من طلبات الحجز">
          {d ? <Bars tone="gold" items={d.bookings.byGoal.slice(0, 6).map((g) => ({ label: g.goal, value: g.count }))} /> : <Skeleton />}
        </Panel>
        <Panel title="الأوقات المفضلة">
          {d ? <Bars tone="mint" items={d.bookings.bySlot.slice(0, 6).map((s) => ({ label: s.slot, value: s.count }))} /> : <Skeleton />}
        </Panel>
        <Panel title="شبكات الكروت">
          {d ? <Bars tone="brand" items={Object.entries(d.payments.byBrand).map(([k, v]) => ({ label: BRAND_LABEL[k] ?? k, value: v }))} /> : <Skeleton />}
        </Panel>
        <Panel title="أسباب الرفض" sub="أكواد البنك في العمليات الفاشلة">
          {d ? (
            d.payments.declineCodes.length ? (
              <Bars tone="brand" items={d.payments.declineCodes.map((c) => ({ label: DECLINE_LABEL[c.code] ?? c.code, value: c.count }))} />
            ) : (
              <Empty text="مفيش عمليات مرفوضة 👌" />
            )
          ) : (
            <Skeleton />
          )}
        </Panel>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <Link href="/admin/orders" className="rounded-xl border border-line bg-white/5 px-3.5 py-2 font-bold text-white/70 transition hover:border-brand/50 hover:text-white">
          كل الاشتراكات ←
        </Link>
        <Link href="/admin/bookings" className="rounded-xl border border-line bg-white/5 px-3.5 py-2 font-bold text-white/70 transition hover:border-brand/50 hover:text-white">
          كل الحجوزات ←
        </Link>
        <Link href="/admin/payments" className="rounded-xl border border-line bg-white/5 px-3.5 py-2 font-bold text-white/70 transition hover:border-brand/50 hover:text-white">
          سجل المدفوعات ←
        </Link>
      </div>
    </AdminShell>
  );
}

function Skeleton({ h = "h-28" }: { h?: string }) {
  return <div className={`${h} animate-pulse rounded-xl bg-white/[.04]`} />;
}
