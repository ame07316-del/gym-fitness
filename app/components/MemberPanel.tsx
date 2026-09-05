"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, ArrowLeft, Ban, Bell, CalendarDays, Check, Copy, Crown, Gift, Heart, IdCard, LoaderCircle, Pause,
  Phone, Play, RefreshCw, ScanLine, Snowflake, Trash2, TicketPercent,
} from "lucide-react";
import { ADDONS, FREEZE_DAYS_LIMIT, GYM } from "@/app/lib/data";
import { cx, egp, fmtDate } from "@/app/lib/utils";
import { useGym } from "@/app/lib/store";
import { cardPattern, statusLabel } from "@/app/lib/subscription";
import { SCHEDULE } from "@/app/lib/data";
import { Drawer } from "@/app/components/ui/Overlay";
import { Chip } from "@/app/components/ui/Bits";
import { useToast } from "@/app/components/ui/Toast";

export default function MemberPanel() {
  const {
    panelOpen, setPanelOpen, membership, daysLeft, progress, memberUiReady,
    renew, toggleFreeze, cancelMembership, setAutoRenew, myClasses, toggleClass, bookings, removeBooking, favorites,
  } = useGym();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"card" | "classes" | "bookings">("card");

  const referral = useMemo(() => (membership ? `REF-${membership.orderId.slice(-4)}` : "FITZONE"), [membership]);
  const [copying, setCopying] = useState(false);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(referral);
      setCopying(true);
      setTimeout(() => setCopying(false), 1400);
      toast({ kind: "success", title: "اتنسخ كود الإحالة", body: `${referral} — بخصم 15% لصاحبك و10% ليك.` });
    } catch {
      toast({ kind: "error", title: "النسخ مش متاح في المتصفح ده" });
    }
  };

  const doRenew = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 550));
    renew();
    setBusy(false);
  };

  const mySchedule = useMemo(() => {
    const out: { key: string; day: string; time: string; name: string; trainer: string }[] = [];
    SCHEDULE.forEach((d, di) =>
      d.classes.forEach((c) => {
        const key = `${di}|${c.time}`;
        if (myClasses.includes(key)) out.push({ key, day: d.day, time: c.time, name: c.name, trainer: c.trainer });
      }),
    );
    return out;
  }, [myClasses]);

  return (
    <Drawer open={panelOpen} onClose={() => setPanelOpen(false)} title="عضويتي">
      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-2xl border border-line bg-surface/60 p-1">
        {[
          { id: "card", label: "البطاقة", icon: IdCard },
          { id: "classes", label: `كلاساتي${mySchedule.length ? ` (${mySchedule.length})` : ""}`, icon: Activity },
          { id: "bookings", label: `طلباتي${bookings.length ? ` (${bookings.length})` : ""}`, icon: CalendarDays },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={cx(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold transition",
              tab === t.id ? "text-white" : "text-white/45 hover:text-white/75",
            )}
          >
            {tab === t.id && (
              <motion.span layoutId="member-tab" className="absolute inset-0 -z-10 rounded-xl bg-brand" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
            )}
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {busy && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-white/5 px-3 py-2 text-xs text-white/60">
          <LoaderCircle className="h-4 w-4 animate-spin" /> جاري تنفيذ العملية…
        </div>
      )}

      {!memberUiReady ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : !membership ? (
        <EmptyPanel onGo={() => setPanelOpen(false)} />
      ) : tab === "card" ? (
        <div className="space-y-4">
          {/* البطاقة */}
          <div className="relative overflow-hidden rounded-3xl border border-brand/35 bg-gradient-to-br from-brand-dark/35 via-surface-2 to-ink p-5">
            <span className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-brand/25 blur-3xl" />
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/25 to-transparent" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.25em] text-white/45">FitZone Pro · Membership</p>
                <div className="mt-2 flex items-center gap-2">
                  <h4 className="text-2xl font-black">{membership.member.name || "عضو جديد"}</h4>
                  <Crown className={cx("h-4 w-4", membership.planId === "vip" ? "text-gold" : "text-brand-soft")} />
                </div>
                <p className="mt-1 text-xs text-white/55">
                  باقة {membership.planName} · <span className="num">{membership.frozenDaysUsed}</span> / {FREEZE_DAYS_LIMIT} يوم تجميد مستهلك
                </p>
              </div>
              <Chip tone={membership.status === "active" ? "mint" : membership.status === "frozen" ? "gold" : "brand"}>
                {statusLabel[membership.status]}
              </Chip>
            </div>

            <div className="relative mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="num text-sm font-black tracking-[.28em] text-white/85">{membership.orderId}</p>
                <p className="mt-1.5 text-[11px] text-white/45">
                  صالحة حتى {fmtDate(membership.endsAt)}
                </p>
              </div>
              <div className="grid shrink-0 gap-[3px] rounded-xl bg-white p-2" aria-hidden>
                {cardPattern(membership.orderId, 8).map((row, r) => (
                  <div key={r} className="flex gap-[3px]">
                    {row.map((on, c) => (
                      <span key={c} className={cx("h-[7px] w-[7px] rounded-[1px]", on ? "bg-ink" : "bg-white")} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* شريط التقدم */}
            <div className="relative mt-5">
              <div className="mb-1.5 flex justify-between text-[11px] text-white/50">
                <span>
                  فاضل <span className="num font-black text-white">{daysLeft}</span> يوم
                </span>
                <span className="num">{Math.round(progress * 100)}٪ مستهلك</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={cx("h-full rounded-full", daysLeft < 7 ? "bg-gold" : "bg-brand")}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              {daysLeft <= 7 && membership.status === "active" && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-gold">
                  <Bell className="h-3.5 w-3.5" /> العضوية هتخلص قريب — جدّد دلوقتي عشان متوقفش.
                </p>
              )}
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn icon={RefreshCw} label="تجديد الفترة" onClick={doRenew} primary disabled={busy} sub={`+${membership.months} شهر`} />
            {membership.status === "frozen" ? (
              <ActionBtn icon={Play} label="إلغاء التجميد" onClick={toggleFreeze} sub="هترجع فوراً" />
            ) : (
              <ActionBtn
                icon={Pause}
                label="تجميد الاشتراك"
                onClick={toggleFreeze}
                sub={`فاضل ${FREEZE_DAYS_LIMIT - membership.frozenDaysUsed} يوم`}
                disabled={membership.frozenDaysUsed >= FREEZE_DAYS_LIMIT}
              />
            )}
            <ActionBtn icon={Snowflake} label="تحويل لباقة أعلى" onClick={() => { setPanelOpen(false); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }} sub="الفرق بيحسب نسبة" />
            <ActionBtn icon={Ban} label={membership.autoRenew ? "إيقاف التجديد" : "تفعيل التجديد"} onClick={() => setAutoRenew(!membership.autoRenew)} sub={membership.autoRenew ? "التجديد التلقائي شغال" : "مقفول حالياً"} tone={membership.autoRenew ? "warn" : "ok"} />
          </div>

          {/* الملخص */}
          <div className="rounded-2xl border border-line bg-surface/50 p-4">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-black">تفاصيل الاشتراك</h5>
              <span className="num text-[11px] text-white/40">#{membership.orderId}</span>
            </div>
            <dl className="mt-3 space-y-2 text-[13px]">
              <Line k="الباقة" v={`${membership.planName} · ${fmtDate(membership.startedAt)}`} />
              <Line k="قيمة الفترة" v={egp(membership.total)} />
              <Line k="يعادل شهرياً" v={egp(membership.perMonth)} />
              <Line k="طريقة الدفع" v={payLabel(membership.payment)} />
              {membership.coupon && <Line k="كود الخصم" v={membership.coupon} good />}
              <Line k="الهدف" v={membership.member.goal || "—"} />
              <Line k="موبايل" v={membership.member.phone} />
            </dl>
            {membership.addonIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                {membership.addonIds.map((id) => {
                  const a = ADDONS.find((x) => x.id === id);
                  return a ? (
                    <Chip key={id}>
                      <Check className="h-3 w-3 text-mint" /> {a.name}
                    </Chip>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* إحالة */}
          <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/[.07] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
              <Gift className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">اجيب صاحبك = خصم لينا اتنين</p>
              <p className="num mt-0.5 truncate text-xs text-white/50">{referral}</p>
            </div>
            <button onClick={copyRef} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/20">
              {copying ? <Check className="h-3.5 w-3.5 text-mint" /> : <Copy className="h-3.5 w-3.5" />}
              {copying ? "اتنسخ" : "نسخ"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-white/[.03] p-4 text-xs">
            <span className="flex items-center gap-2 text-white/50">
              <ScanLine className="h-4 w-4" /> ورّي الكود ده للكاشير في أي فرع
            </span>
            <a href={`tel:${GYM.whatsapp}`} className="flex items-center gap-1.5 font-bold text-white/70 hover:text-white">
              <Phone className="h-3.5 w-3.5" /> {GYM.phone}
            </a>
          </div>

          {membership.status !== "cancelled" && (
            <button
              onClick={cancelMembership}
              className="w-full rounded-xl border border-brand/25 py-2.5 text-xs font-bold text-brand-soft/80 transition hover:bg-brand/10"
            >
              إلغاء التجديد التلقائي وإنهاء العضوية بعد نهاية الفترة
            </button>
          )}
        </div>
      ) : tab === "classes" ? (
        <div className="space-y-2.5">
          {mySchedule.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center">
              <Activity className="mx-auto h-8 w-8 text-white/25" />
              <p className="mt-3 text-sm font-bold">محجزتش أي كلاس لسه</p>
              <p className="mt-1 text-xs text-white/45">روح على قسم «الجدول» واضغط «احجز مكاني» على أي كلاس.</p>
              <button
                onClick={() => {
                  setPanelOpen(false);
                  document.getElementById("schedule")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mx-auto mt-4 flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-black"
              >
                شوف الجدول <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            mySchedule.map((c) => (
              <div key={c.key} className="flex items-center gap-3 rounded-2xl border border-line bg-surface/50 p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-xs font-black text-brand-soft">
                  {c.time.split(":")[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{c.name}</p>
                  <p className="text-[11px] text-white/45">
                    {c.day} · {c.time} · الكابتن {c.trainer}
                  </p>
                </div>
                <button
                  onClick={() => toggleClass(c.key, c.name)}
                  aria-label={`إلغاء ${c.name}`}
                  className="rounded-lg border border-line p-2 text-white/40 transition hover:border-brand/50 hover:text-brand-soft"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
          {favorites.length > 0 && (
            <p className="pt-2 text-center text-[11px] text-white/40">
              <Heart className="mr-1 inline h-3 w-3 text-brand-soft" /> عندك {favorites.length} كوتش مفضل — اضغط على القلب في
              قسم الكوتشات.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center">
              <TicketPercent className="mx-auto h-8 w-8 text-white/25" />
              <p className="mt-3 text-sm font-bold">مفيش طلبات محفوظة</p>
              <p className="mt-1 text-[11px] text-white/45">أول ما تحجز جلسة تجريبية هتلاقي الطلب هنا بحالته.</p>
            </div>
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="rounded-2xl border border-line bg-surface/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="num text-xs font-black text-white/70">{b.id}</span>
                  <Chip tone={b.status === "confirmed" ? "mint" : "gold"}>
                    {b.status === "confirmed" ? "مؤكد" : "في الانتظار"}
                  </Chip>
                </div>
                <p className="mt-2 text-sm font-bold">{b.goal}</p>
                <p className="mt-0.5 text-[11px] text-white/45">
                  {b.name} · {b.phone} · {fmtDate(b.createdAt)}
                </p>
                <div className="mt-3 flex gap-2">
                  <a
                    href={`https://wa.me/${GYM.whatsapp}?text=${encodeURIComponent(`طلب حجز ${b.id} — ${b.goal}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg border border-line bg-white/5 py-1.5 text-center text-[11px] font-bold transition hover:bg-white/10"
                  >
                    تابِع على واتساب
                  </a>
                  <button
                    onClick={() => removeBooking(b.id)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold text-white/50 transition hover:border-brand/50 hover:text-brand-soft"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Drawer>
  );
}

function Line({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-white/45">{k}</dt>
      <dd className={cx("truncate text-right font-bold", good ? "text-mint" : "text-white/85")}>{v}</dd>
    </div>
  );
}

function payLabel(p: string) {
  return { card: "فيزا / ماستركارد", wallet: "محفظة إلكترونية", install: "تقسيط 3 دفعات", cash: "كاش في الفرع" }[p] ?? p;
}

function ActionBtn({
  icon: Icon, label, sub, onClick, primary, disabled, tone,
}: {
  icon: typeof IdCard;
  label: string;
  sub?: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  tone?: "warn" | "ok";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "group flex items-center gap-2.5 rounded-2xl border p-3 text-right transition active:scale-[.97] disabled:opacity-40",
        primary
          ? "border-brand bg-brand text-white hover:bg-brand-soft"
          : tone === "warn"
            ? "border-gold/35 bg-gold/[.07] text-gold hover:bg-gold/15"
            : "border-line bg-white/[.03] text-white/75 hover:border-white/25 hover:text-white",
      )}
    >
      <Icon className={cx("h-4 w-4 shrink-0 transition group-hover:scale-110", primary && "text-white")} />
      <span className="min-w-0">
        <span className="block truncate text-xs font-black">{label}</span>
        {sub && <span className={cx("block truncate text-[10px]", primary ? "text-white/70" : "text-white/40")}>{sub}</span>}
      </span>
    </button>
  );
}

function EmptyPanel({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface/40 p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand-soft">
        <IdCard className="h-7 w-7" />
      </span>
      <h4 className="mt-4 text-lg font-black">لسه مفيش عضوية فعّالة</h4>
      <p className="mx-auto mt-2 max-w-[16rem] text-xs leading-relaxed text-white/50">
        اختار باقة ومدّة من قسم الاشتراكات، وهتلاقي كارت العضوية هنا بكل تفاصيله — تجميد، تجديد، وكود إحالة.
      </p>
      <button
        onClick={() => {
          onGo();
          document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
        }}
        className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-white transition hover:bg-brand-soft"
      >
        ابدأ اشتراكك <ArrowLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
