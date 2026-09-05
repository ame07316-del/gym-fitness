"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, BadgePercent, Check, ChevronDown, Info, Lock, ScanLine, Tag, TicketPercent, X,
} from "lucide-react";
import { ADDONS, COUPONS, CYCLES, PLANS } from "@/app/lib/data";
import { egp, cx } from "@/app/lib/utils";
import { useGym } from "@/app/lib/store";
import { matchCoupon } from "@/app/lib/subscription";
import { Chip, Reveal, SectionTitle } from "@/app/components/ui/Bits";
import { useToast } from "@/app/components/ui/Toast";

export default function Pricing() {
  const { draft, setDraft, quote, toggleAddon, openCheckout, membership, hasMembership } = useGym();
  const toast = useToast();
  const [couponText, setCouponText] = useState(draft.coupon ?? "");
  const [showCoupons, setShowCoupons] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === draft.planId)!;
  const cycle = CYCLES.find((c) => c.id === draft.cycle)!;

  const priceOf = useMemo(
    () =>
      Object.fromEntries(
        PLANS.map((p) => {
          const gross = p.monthly * cycle.months;
          const net = gross * (1 - cycle.off);
          return [p.id, { gross, net, perMonth: net / cycle.months, saved: gross - net }];
        }),
      ) as Record<string, { gross: number; net: number; perMonth: number; saved: number }>,
    [cycle],
  );

  const applyCoupon = () => {
    const code = couponText.trim().toUpperCase();
    if (!code) {
      setDraft((d) => ({ ...d, coupon: null }));
      toast({ kind: "info", title: "اتشيل الكود" });
      return;
    }
    const found = matchCoupon(code);
    if (!found) {
      toast({ kind: "error", title: "كود غير صحيح", body: "الكودات المتاحة: FIT10 · NEW25 · YEAR20 · REFERRAL" });
      return;
    }
    setDraft((d) => ({ ...d, coupon: found.code }));
    toast({ kind: "success", title: `الكود اشتغل: خصم ${Math.round(found.off * 100)}%`, body: found.label });
    setShowCoupons(false);
  };

  return (
    <section id="pricing" className="relative py-20 sm:py-24">
      <span aria-hidden className="absolute right-1/2 top-24 -z-10 h-72 w-72 translate-x-1/2 rounded-full bg-brand/12 blur-[120px]" />
      <div className="mx-auto max-w-7xl px-4">
        <SectionTitle
          kicker="الاشتراكات"
          title={
            <>
              اختار الباقة <span className="text-brand-soft">واملاها أونلاين</span> في دقيقة
            </>
          }
          sub="كل الباقات تشمل دخول غير محدود، كارت عضوية رقمي، وتطبيق متابعة — وتقدر تجمّد أو تجدد في أي وقت من لوحة العضوية."
        />

        {/* اختيار المدة */}
        <Reveal className="mb-8 flex flex-col items-center gap-3">
          <div className="relative flex w-full max-w-2xl items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-surface/70 p-1.5 no-bar">
            {CYCLES.map((c) => (
              <button
                key={c.id}
                onClick={() => setDraft((d) => ({ ...d, cycle: c.id }))}
                className={cx(
                  "relative flex-1 shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-bold transition",
                  draft.cycle === c.id ? "text-white" : "text-white/50 hover:text-white/80",
                )}
              >
                {draft.cycle === c.id && (
                  <motion.span suppressHydrationWarning
                    layoutId="cycle-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-brand"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {c.label}
                {c.off > 0 && (
                  <span className={cx("num mr-1 text-[11px]", draft.cycle === c.id ? "text-white/85" : "text-mint")}>
                    −{Math.round(c.off * 100)}%
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-white/40">
            <Info className="h-3.5 w-3.5" /> الأسعار قبل ضريبة القيمة المضافة ({Math.round(14)}٪) · {cycle.note}
          </p>
        </Reveal>

        {/* الباقات */}
        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => {
            const active = plan.id === draft.planId;
            const p = priceOf[plan.id];
            return (
              <Reveal key={plan.id} delay={i * 0.08}>
                <motion.div suppressHydrationWarning
                  onClick={() => setDraft((d) => ({ ...d, planId: plan.id }))}
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className={cx(
                    "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border-2 bg-surface/60 p-6 backdrop-blur",
                    active ? "border-brand shadow-[0_30px_70px_-40px_rgba(225,29,46,.9)]" : cx(plan.ring, "hover:border-white/25"),
                  )}
                >
                  <span
                    aria-hidden
                    className={cx(
                      "absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-70 transition group-hover:opacity-100",
                      plan.id === "vip" ? "from-gold/15" : plan.id === "pro" ? "from-brand/20" : "from-white/[.06]",
                    )}
                  />
                  {plan.badge && (
                    <span
                      className={cx(
                        "absolute -top-px left-6 rounded-b-xl px-3 py-1 text-[11px] font-black",
                        plan.id === "vip" ? "bg-gold text-black" : "bg-brand text-white",
                      )}
                    >
                      {plan.badge}
                    </span>
                  )}

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cx(
                          "grid h-11 w-11 place-items-center rounded-2xl border transition",
                          active ? "border-brand bg-brand/15 text-brand-soft" : "border-line bg-white/5 text-white/70",
                        )}
                      >
                        <plan.icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-xl font-black leading-none">{plan.name}</h3>
                        <p className="mt-1 text-[11px] text-white/45">{plan.tag}</p>
                      </div>
                    </div>
                    <span
                      className={cx(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition",
                        active ? "border-brand bg-brand text-white" : "border-white/20 text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  </div>

                  <div className="relative mt-6 min-h-[86px]">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div suppressHydrationWarning
                        key={draft.cycle + plan.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="flex items-end gap-2">
                          <span className="text-[2.7rem] font-black leading-none tracking-tight">
                            <span className="num">{Math.round(p.perMonth)}</span>
                          </span>
                          <span className="pb-1 text-sm text-white/45">ج.م / شهر</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {cycle.months > 1 && (
                            <span className="text-white/40 line-through">
                              <span className="num">{egp(p.gross)}</span>
                            </span>
                          )}
                          <span className="num font-bold text-white/70">{egp(p.net)} / {cycle.label}</span>
                          {p.saved > 0 && <Chip tone="mint">وفّرت {egp(p.saved)}</Chip>}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <ul className="relative mt-5 flex-1 space-y-2.5 border-t border-line pt-5">
                    {plan.perks.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] leading-snug text-white/75">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" /> {f}
                      </li>
                    ))}
                    {plan.missing.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] leading-snug text-white/28">
                        <X className="mt-0.5 h-4 w-4 shrink-0" /> <span className="line-through">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="relative mt-5 flex items-center justify-between gap-2 border-t border-line pt-4">
                    <span className="text-[11px] text-white/35">الأنسب لـ: {plan.best}</span>
                    <span className={cx("text-xs font-black transition", active ? "text-brand-soft" : "text-white/45 group-hover:text-white")}>
                      {active ? "مختارة ✓" : "اختارها"}
                    </span>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}
        </div>

        {/* الإضافات + الملخص */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
          <Reveal className="rounded-3xl border border-line bg-surface/50 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-black">
                <BadgePercent className="h-5 w-5 text-brand-soft" /> عزّز باقتك (اختياري)
              </h3>
              <span className="text-xs text-white/40">
                <span className="num">{draft.addonIds.length}</span> مضاف · {egp(quote.addonsMonthly)} / شهر
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ADDONS.map((a) => {
                const on = draft.addonIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAddon(a.id)}
                    aria-pressed={on}
                    className={cx(
                      "group flex items-start gap-3 rounded-2xl border p-3.5 text-right transition active:scale-[.98]",
                      on ? "border-brand/70 bg-brand/10" : "border-line bg-white/[.03] hover:border-white/25",
                    )}
                  >
                    <span
                      className={cx(
                        "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition",
                        on ? "border-brand bg-brand text-white" : "border-white/25 text-transparent group-hover:border-white/50",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <a.icon className={cx("h-4 w-4", on ? "text-brand-soft" : "text-white/45")} />
                        <span className="truncate text-sm font-bold">{a.name}</span>
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-white/45">{a.desc}</span>
                    </span>
                    <span className="num shrink-0 whitespace-nowrap text-xs font-black text-white/70">
                      +{a.price}/ش
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-line bg-white/[.02] p-4">
              <label htmlFor="coupon" className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Tag className="h-4 w-4 text-gold" /> كود الخصم
              </label>
              <div className="flex gap-2">
                <input
                  id="coupon"
                  value={couponText}
                  onChange={(e) => setCouponText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                  placeholder="FIT10"
                  className="w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-sm uppercase tracking-wider outline-none transition placeholder:text-white/25 focus:border-brand"
                />
                <button onClick={applyCoupon} className="shrink-0 rounded-xl bg-white/10 px-4 text-sm font-bold transition hover:bg-white/20">
                  طبّق
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                {quote.coupon && !quote.couponError ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-mint">
                    <Check className="h-3.5 w-3.5" /> {quote.coupon.code} مفعّل — خصم {Math.round(quote.coupon.off * 100)}٪
                  </span>
                ) : quote.couponError ? (
                  <span className="text-xs font-bold text-brand-soft">{quote.couponError}</span>
                ) : (
                  <button onClick={() => setShowCoupons((s) => !s)} className="flex items-center gap-1 text-xs text-white/45 hover:text-white">
                    اعرض الكودات المتاحة <ChevronDown className={cx("h-3.5 w-3.5 transition", showCoupons && "rotate-180")} />
                  </button>
                )}
                {draft.coupon && (
                  <button
                    onClick={() => {
                      setDraft((d) => ({ ...d, coupon: null }));
                      setCouponText("");
                    }}
                    className="text-xs text-white/40 hover:text-brand-soft"
                  >
                    إلغاء الكود
                  </button>
                )}
              </div>
              <AnimatePresence initial={false}>
                {showCoupons && (
                  <motion.ul suppressHydrationWarning
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 grid gap-2 overflow-hidden sm:grid-cols-2"
                  >
                    {COUPONS.map((c) => (
                      <li key={c.code}>
                        <button
                          onClick={() => {
                            setCouponText(c.code);
                            setDraft((d) => ({ ...d, coupon: c.code }));
                            toast({ kind: "success", title: `اتفعّل كود ${c.code}` });
                          }}
                          className="flex w-full items-center gap-2 rounded-xl border border-line bg-ink/60 px-3 py-2 text-right transition hover:border-gold/50"
                        >
                          <TicketPercent className="h-4 w-4 shrink-0 text-gold" />
                          <span className="num text-xs font-black text-white">{c.code}</span>
                          <span className="truncate text-[11px] text-white/50">{c.label}</span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </Reveal>

          {/* ملخص الطلب */}
          <Reveal delay={0.1}>
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-3xl border border-brand/35 bg-gradient-to-b from-brand/[.12] to-surface/70 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">ملخص اشتراكك</h3>
                  <Chip tone="brand">
                    <ScanLine className="h-3.5 w-3.5" /> تفعيل فوري
                  </Chip>
                </div>

                <dl className="mt-5 space-y-2.5 text-sm">
                  <Row label={`باقة ${quote.planName}`} value={egp(quote.baseMonthly * quote.months)} />
                  <Row label={`(${quote.cycleLabel} · ${quote.months} شهر)`} muted value="" />
                  {quote.addonsMonthly > 0 && <Row label={`الإضافات (${draft.addonIds.length})`} value={`+ ${egp(quote.addonsMonthly * quote.months)}`} />}
                  {quote.cycleDiscount > 0 && <Row label={`خصم المدة ${Math.round(cycle.off * 100)}%`} value={`− ${egp(quote.cycleDiscount)}`} good />}
                  {quote.couponDiscount > 0 && <Row label={`كود ${quote.coupon?.code}`} value={`− ${egp(quote.couponDiscount)}`} good />}
                  <Row label="ض.ق.م 14%" value={egp(quote.vat)} muted />
                </dl>

                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-white/60">الإجمالي</span>
                    <div className="text-left">
                      <div className="text-3xl font-black leading-none">
                        <span className="num">{egp(quote.total).replace(" ج.م", "")}</span>{" "}
                        <span className="text-base">ج.م</span>
                      </div>
                      <div className="num mt-1 text-[11px] text-white/45">
                        = {Math.round(quote.perMonth)} ج.م / شهر
                      </div>
                    </div>
                  </div>
                  {quote.saved > 0 && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-mint/30 bg-mint/10 px-3 py-2 text-xs font-bold text-mint">
                      <span>أفضل من الدفع الشهري بـ</span>
                      <span className="num">{egp(quote.saved)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => openCheckout()}
                  className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-black text-white transition hover:bg-brand-soft active:scale-[.98]"
                >
                  {hasMembership ? "جدّد / غيّر الاشتراك" : "أكمل الاشتراك"}
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                </button>
                <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/40">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  بدون بطاقة في الخطوة دي — الدفع بيتأكد مع الكاشير أو أونلاين، وتقدر تلغي في أي وقت قبل التفعيل.
                </p>
                {selectedPlan && membership?.planId === selectedPlan.id && (
                  <p className="mt-3 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] font-bold text-gold">
                    عضويتك الحالية على نفس الباقة — التجديد هيمدّد الصلاحية من تاريخ الانتهاء.
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, muted, good }: { label: string; value: string; muted?: boolean; good?: boolean }) {
  return (
    <div className={cx("flex items-center justify-between gap-3", muted && "text-white/40")}>
      <dt className={cx("text-[13px]", !muted && !good && "text-white/70")}>{label}</dt>
      {value && (
        <dd className={cx("num text-sm font-bold", good ? "text-mint" : "text-white")}>{value}</dd>
      )}
    </div>
  );
}
