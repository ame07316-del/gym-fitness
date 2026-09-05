"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Banknote, CalendarClock, Check, CircleCheck, CreditCard, LoaderCircle, X,
  Lock, PartyPopper, Phone, ShieldCheck, Sparkles, Wallet, Split,
} from "lucide-react";
import { ADDONS, GOALS, GYM, PAY_METHODS, TIME_SLOTS } from "@/app/lib/data";

const ADDON_LOOKUP = Object.fromEntries(ADDONS.map((a) => [a.id, a]));
import { cx, egp, isEGPhone } from "@/app/lib/utils";
import { useGym } from "@/app/lib/store";
import { cardPattern } from "@/app/lib/subscription";
import { Modal } from "@/app/components/ui/Overlay";
import {
  BRAND_LABEL, IS_SANDBOX, TEST_CARDS, authorize, confirmPayment, detectBrand, validateCard, type PayMethod,
} from "@/app/lib/payment";
import { useToast } from "@/app/components/ui/Toast";

const STEPS = [
  { id: 0, label: "المراجعة" },
  { id: 1, label: "بياناتك" },
  { id: 2, label: "الدفع" },
  { id: 3, label: "تم" },
];

export default function Checkout() {
  const { checkout, closeCheckout, setCheckoutStep, draft, quote, confirmSubscription, setPanelOpen } = useGym();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", phone: "", goal: GOALS[0], start: TIME_SLOTS[3].id, notes: "" });
  const [pay, setPay] = useState<string>("card");
  const [card, setCard] = useState({ number: "", exp: "", cvv: "", holder: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [payPhase, setPayPhase] = useState<"idle" | "auth" | "otp" | "failed" | "done">("idle");
  const [payMsg, setPayMsg] = useState("");
  const [intent, setIntent] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [wallet, setWallet] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<null | {
    orderId: string;
    endsAt: number;
    planName: string;
    cycleLabel: string;
    total: number;
    perMonth: number;
    name: string;
  }>(null);

  const step = checkout.step;

  useEffect(() => {
    if (checkout.open) {
      setDone(null);
      setErrors({});
      setCheckoutStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout.open]);

  const submitLead = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e.name = "اكتب اسمك كما في البطاقة";
    if (!isEGPhone(form.phone)) e.phone = "مثال صحيح: 01012345678";
    setErrors(e);
    if (Object.keys(e).length === 0) setCheckoutStep(2);
    else toast({ kind: "error", title: "راجع البيانات", body: "فيه خانة أو اتنين محتاجة تعديل." });
  };

  const finish = async () => {
    setLoading(true);
    setPayPhase("auth");
    const rec = await confirmSubscription({
      planId: draft.planId,
      planName: quote.planName,
      cycle: draft.cycle,
      addonIds: draft.addonIds,
      coupon: quote.coupon?.code ?? null,
      member: { name: form.name.trim(), phone: form.phone.trim(), goal: form.goal },
      payment: pay,
      total: quote.total,
      perMonth: quote.perMonth,
      months: quote.months,
    });
    setLoading(false);
    if (rec) {
      setPayPhase("done");
      setDone({
        orderId: rec.orderId,
        endsAt: rec.endsAt,
        planName: quote.planName,
        cycleLabel: quote.cycleLabel,
        total: quote.total,
        perMonth: quote.perMonth,
        name: form.name.trim() || "بطل",
      });
      setCheckoutStep(3);
    }
  };

  const startPayment = async () => {
    if (pay === "card") {
      const check = validateCard(card);
      setCardErrors(check.errors as Record<string, string>);
      if (!check.valid) {
        setPayPhase("idle");
        toast({ kind: "error", title: "بيانات البطاقة ناقصة", body: Object.values(check.errors)[0] });
        return;
      }
    }
    if (pay === "wallet" && wallet.replace(/\D/g, "").length < 11) {
      setErrors({ pay: "اكتب رقم المحفظة (11 رقم) عشان نطابق التحويل" });
      toast({ kind: "error", title: "رقم المحفظة ناقص" });
      return;
    }
    setErrors({});
    setPayMsg("");
    setPayPhase("auth");
    const res = await authorize({
      method: pay as PayMethod,
      amount: Math.round(quote.total),
      card: pay === "card" ? card : undefined,
      description: `FitZone Pro — باقة ${quote.planName} / ${quote.cycleLabel}`,
    });
    if (res.status === "requires_action") {
      setIntent(res.reference);
      setOtp("");
      setPayPhase("otp");
      setPayMsg(res.message);
      toast({ kind: "info", title: "البنك طلب تحقق إضافي", body: "ادخل رمز 3-D Secure اللي وصلك على SMS" });
      return;
    }
    if (!res.ok) {
      setPayPhase("failed");
      setPayMsg(res.message);
      toast({ kind: "error", title: "العملية اترفضت", body: res.message });
      return;
    }
    await finish();
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setPayMsg("الرمز لازم يكون 6 أرقام");
      setPayPhase("failed");
      return;
    }
    setPayPhase("auth");
    const res = await confirmPayment(intent ?? "", otp);
    if (!res.ok) {
      setPayPhase("failed");
      setPayMsg(res.message);
      toast({ kind: "error", title: "رمز التحقق غلط", body: res.message });
      return;
    }
    setPayMsg(res.message);
    await finish();
  };

  return (
    <Modal
      open={checkout.open}
      onClose={closeCheckout}
      size="lg"
      title={step === 3 ? "تم تفعيل عضويتك 🎉" : "إكمال الاشتراك"}
      sub={
        step < 3 ? (
          <span className="flex items-center gap-2">
            <span className="text-white/70">{quote.planName}</span>
            <span className="text-white/30">·</span>
            <span>{quote.cycleLabel}</span>
            <span className="text-white/30">·</span>
            <span className="num font-bold text-brand-soft">{egp(quote.total)}</span>
          </span>
        ) : (
          "احتفظ برقم الطلب لتأكيد الحجز عند الكاشير"
        )
      }
      footer={
        step === 3 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => {
                closeCheckout();
                setPanelOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-black text-white transition hover:bg-brand-soft"
            >
              <Sparkles className="h-4 w-4" /> افتح بطاقة العضوية
            </button>
            <a
              href={`https://wa.me/${GYM.whatsapp}?text=${encodeURIComponent(`يا هلا، افتحت اشتراك ${done?.planName ?? quote.planName} (${done?.cycleLabel ?? quote.cycleLabel}) ورقم طلبي ${done?.orderId ?? ""} — عايز أكمل الدفع.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
            >
              <Phone className="h-4 w-4 text-mint" /> أكمّل على واتساب
            </a>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => (step === 0 ? closeCheckout() : setCheckoutStep(step - 1))}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white/55 transition hover:bg-white/5 hover:text-white"
            >
              {step === 0 ? "إلغاء" : <><ArrowRight className="h-4 w-4" /> رجوع</>}
            </button>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-white/40 sm:block">
                الخطوة <span className="num font-black text-white">{step + 1}</span> من 3
              </span>
              <button
                onClick={step === 0 ? () => setCheckoutStep(1) : step === 1 ? submitLead : payPhase === "otp" ? verifyOtp : startPayment}
                disabled={loading}
                className="group flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-black text-white transition hover:bg-brand-soft active:scale-95 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" /> {payPhase === "otp" ? "جاري التحقق من البنك…" : "جاري اعتماد العملية…"}
                  </>
                ) : step === 2 ? (
                  payPhase === "otp" ? (
                    <>
                      تأكيد الرمز <ArrowLeft className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      ادفع {egp(quote.total).replace(" ج.م", "")} ج.م <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                    </>
                  )
                ) : (
                  <>
                    التالي <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        )
      }
    >
      {/* شريط الخطوات */}
      {step < 3 && (
        <div className="mb-6 flex items-center gap-2">
          {STEPS.slice(0, 3).map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    "grid h-7 w-7 place-items-center rounded-full text-[11px] font-black transition",
                    step > i ? "bg-mint text-black" : step === i ? "bg-brand text-white" : "border border-line bg-white/5 text-white/40",
                  )}
                >
                  {step > i ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="num">{i + 1}</span>}
                </span>
                <span className={cx("text-xs font-bold", step === i ? "text-white" : "text-white/40")}>{s.label}</span>
              </div>
              {i < 2 && <span className={cx("h-px flex-1 transition", step > i ? "bg-mint/60" : "bg-line")} />}
            </React.Fragment>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 0 && <ReviewStep />}
          {step === 1 && <LeadStep />}
          {step === 2 && <PayStep />}
          {step === 3 && <DoneStep />}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );

  /* ---------------- steps ---------------- */
  function ReviewStep() {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-black">باقة {quote.planName}</h4>
            <button onClick={closeCheckout} className="text-xs font-bold text-brand-soft hover:underline">
              غيّر الباقة
            </button>
          </div>
          <p className="mt-1 text-xs text-white/45">
            {quote.cycleLabel} · <span className="num">{quote.months}</span> شهر ·
            {" "}
            <span className="num">{Math.round(quote.perMonth)}</span> ج.م شهرياً
          </p>
          <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-[13px]">
            <li className="flex justify-between">
              <span className="text-white/60">سعر الباقة</span>
              <span className="num font-bold">{egp(quote.baseMonthly * quote.months)}</span>
            </li>
            {draft.addonIds.length > 0 &&
              draft.addonIds.map((id) => {
                const a = ADDON_LOOKUP[id];
                if (!a) return null;
                return (
                  <li key={id} className="flex justify-between">
                    <span className="flex items-center gap-1.5 text-white/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {a.name}
                    </span>
                    <span className="num font-bold">+{egp(a.price * quote.months)}</span>
                  </li>
                );
              })}
            {quote.cycleDiscount > 0 && (
              <li className="flex justify-between text-mint">
                <span>خصم المدة</span>
                <span className="num font-bold">−{egp(quote.cycleDiscount)}</span>
              </li>
            )}
            {quote.couponDiscount > 0 && (
              <li className="flex justify-between text-mint">
                <span>كود {quote.coupon?.code}</span>
                <span className="num font-bold">−{egp(quote.couponDiscount)}</span>
              </li>
            )}
            <li className="flex justify-between text-white/45">
              <span>ض.ق.م 14%</span>
              <span className="num">{egp(quote.vat)}</span>
            </li>
            <li className="flex items-end justify-between border-t border-line pt-3 text-base">
              <span className="font-bold">الإجمالي</span>
              <span className="num font-black text-brand-soft">{egp(quote.total)}</span>
            </li>
          </ul>
        </div>
        {quote.saved > 0 && (
          <p className="flex items-center gap-2 rounded-2xl border border-mint/30 bg-mint/10 px-4 py-3 text-sm font-bold text-mint">
            <PartyPopper className="h-4 w-4" /> بتوفّر {egp(quote.saved)} مقارنةً بالدفع الشهري (
            <span className="num">{Math.round(quote.savedPct * 100)}</span>٪)
          </p>
        )}
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/40">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
          ده سيناريو اشتراك تجريبي للواجهة: لا يتم خصم أي مبلغ ولا بتخزين بيانات بطاقات. بيانات الحجز بتترسل لخيط
          <span className="num mx-1 text-white/60">/api/subscribe</span> بتاع المشروع.
        </p>
      </div>
    );
  }

  function LeadStep() {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم بالكامل" error={errors.name} className="sm:col-span-2">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: محمود علي"
            className={inputCls(errors.name)}
            autoComplete="name"
          />
        </Field>
        <Field label="موبايل / واتساب" error={errors.phone}>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="01012345678"
            inputMode="tel"
            dir="ltr"
            className={cx(inputCls(errors.phone), "text-left")}
            autoComplete="tel"
          />
        </Field>
        <Field label="هدفك في الجيم">
          <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className={inputCls()}>
            {GOALS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field label="أفضل وقت للبدء" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((t) => (
              <button
                key={t.id}
                onClick={() => setForm({ ...form, start: t.id })}
                className={cx(
                  "rounded-xl border px-3 py-2 text-xs font-bold transition",
                  form.start === t.id ? "border-brand bg-brand/15 text-white" : "border-line bg-white/[.03] text-white/50 hover:text-white",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="ملاحظات للكوتش (اختياري)" className="sm:col-span-2">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="إصابات، عمليات، أدوية، أو أي حاجة عايزنا نعرفها…"
            className={cx(inputCls(), "resize-none")}
          />
        </Field>
      </div>
    );
  }

  function PayStep() {
    const brand = detectBrand(card.number);
    const check = validateCard(card);
    const processing = payPhase === "auth";

    return (
      <div className="space-y-4">
        {/* حالة البيئة */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-line bg-white/[.02] px-4 py-3">
          <span className="flex items-center gap-2 text-[11px] font-bold">
            <span className={cx("h-2 w-2 rounded-full", IS_SANDBOX ? "bg-gold live-dot" : "bg-mint")} />
            {IS_SANDBOX ? "وضع التجربة (Sandbox) — مفيش فلوس اتخصمت" : "وضع الإنتاج — بوابة دفع حقيقية"}
            <span className="text-white/35">· provider: <span className="num">{IS_SANDBOX ? "sandbox" : "external"}</span></span>
          </span>
          <span className="num flex items-center gap-1.5 text-[11px] text-white/40">
            {processing ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin text-brand-soft" /> جاري الاتصال بالبنك…
              </>
            ) : (
              <>
                auth: <span className="text-white/70">POST /api/pay</span>
              </>
            )}
          </span>
        </div>

        {IS_SANDBOX && (
          <div className="rounded-2xl border border-line bg-surface/50 p-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-black">
              <Sparkles className="h-4 w-4 text-gold" /> بطاقات وهمية للتجربة — اضغط واحدة تتكتب في الخانات
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {TEST_CARDS.map((t) => {
                const last4 = t.number.slice(-4);
                return (
                  <button
                    key={t.number}
                    type="button"
                    onClick={() => {
                      setCard({ number: t.number, exp: "12/29", cvv: "123", holder: card.holder || "MAHMOUD ALI" });
                      setCardErrors({});
                      setPayPhase("idle");
                      setPayMsg("");
                      setPay("card");
                    }}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line bg-ink px-3 py-2 text-right transition hover:border-brand/50 hover:bg-brand/5"
                  >
                    <span className="num text-[11px] font-black tracking-wider">{t.number}</span>
                    <span className={cx("shrink-0 text-[10px] font-bold", t.tone === "ok" ? "text-mint" : "text-brand-soft")}>{t.result}</span>
                    <span className="num hidden shrink-0 text-[10px] text-white/25 sm:inline">••{last4}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {PAY_METHODS.map((m) => {
            const Icon = m.id === "card" ? CreditCard : m.id === "wallet" ? Wallet : m.id === "install" ? Split : Banknote;
            const on = pay === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setPay(m.id);
                  setErrors({});
                  setPayPhase("idle");
                  setPayMsg("");
                }}
                className={cx(
                  "flex items-center gap-3 rounded-2xl border p-3.5 text-right transition",
                  on ? "border-brand bg-brand/10" : "border-line bg-white/[.03] hover:border-white/25",
                )}
              >
                <span className={cx("grid h-9 w-9 place-items-center rounded-xl", on ? "bg-brand text-white" : "bg-white/5 text-white/50")}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{m.label}</span>
                  <span className="block truncate text-[11px] text-white/45">{m.hint}</span>
                </span>
                <span className={cx("mr-auto grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", on ? "border-brand bg-brand" : "border-white/20")}>
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        {pay === "card" && (
          <div className="grid gap-4 rounded-2xl border border-line bg-surface/50 p-4 sm:grid-cols-2">
            <CardPreview number={card.number} holder={card.holder} exp={card.exp} brand={BRAND_LABEL[brand]} valid={check.valid} />
            <div className="space-y-3">
              <Field label="رقم البطاقة" error={cardErrors.number}>
                <input
                  value={card.number}
                  onChange={(e) => {
                    setCard({ ...card, number: formatCard(e.target.value) });
                    setCardErrors({});
                  }}
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="4242 4242 4242 4242"
                  className={cx(inputCls(cardErrors.number), "num text-left tracking-widest")}
                />
              </Field>
              <Field label="اسم حامل البطاقة" error={cardErrors.holder}>
                <input value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} placeholder="MAHMOUD ALI" className={inputCls(cardErrors.holder)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="تاريخ الانتهاء" error={cardErrors.exp}>
                  <input
                    value={card.exp}
                    onChange={(e) => setCard({ ...card, exp: formatExp(e.target.value) })}
                    dir="ltr"
                    placeholder="MM/YY"
                    className={cx(inputCls(cardErrors.exp), "num text-left")}
                  />
                </Field>
                <Field label="CVV" error={cardErrors.cvv}>
                  <input
                    value={card.cvv}
                    onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    dir="ltr"
                    placeholder="123"
                    className={cx(inputCls(cardErrors.cvv), "num text-left")}
                  />
                </Field>
              </div>
              <p className="flex items-center gap-1.5 text-[10px] text-white/35">
                <ShieldCheck className="h-3 w-3 text-mint" />
                {check.valid ? `رقم صحيح على ${BRAND_LABEL[brand]} • آخر 4 أرقام <span className="num">${card.number.replace(/\D/g, "").slice(-4)}</span>` : "بنفحص الرقم بـ Luhn قبل ما نبعت للبنك"}
              </p>
            </div>
          </div>
        )}

        {pay === "wallet" && (
          <div className="rounded-2xl border border-line bg-surface/50 p-4 text-sm leading-relaxed text-white/60">
            حوّل <span className="num font-black text-white">{egp(quote.total)}</span> على محافظ الجيم، واكتب رقمك نطابق بيك التحويل:
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { n: "فودافون كاش", v: "01000000000" },
                { n: "إنستا باي", v: "fitzone@instapay" },
              ].map((w) => (
                <div key={w.n} className="flex items-center justify-between rounded-xl border border-line bg-ink px-3 py-2.5">
                  <span className="text-xs font-bold text-white/50">{w.n}</span>
                  <span className="num text-sm font-black">{w.v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Field label="رقم المحفظة اللي حوّلت منها">
                <input
                  value={wallet}
                  onChange={(e) => {
                    setWallet(e.target.value);
                    setErrors({});
                  }}
                  dir="ltr"
                  inputMode="tel"
                  placeholder="01012345678"
                  className={cx(inputCls(errors.pay), "num text-left")}
                />
              </Field>
            </div>
          </div>
        )}

        {pay === "install" && (
          <div className="rounded-2xl border border-line bg-surface/50 p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={cx("rounded-xl border p-3", i === 0 ? "border-brand bg-brand/10" : "border-line")}>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/45">
                    <CalendarClock className="h-3.5 w-3.5" /> {i === 0 ? "اليوم" : `بعد ${i * 30} يوم`}
                  </div>
                  <div className="num mt-1 text-lg font-black">{egp(quote.total / 3)}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
              التقسيط على الاشتراكات السنوية و٦ شهور، بدون فوائد. أول قسط بيتحسب دلوقتي والتانيين ليهما مواعيد ثابتة.
            </p>
          </div>
        )}

        {pay === "cash" && (
          <div className="rounded-2xl border border-line bg-surface/50 p-4 text-sm text-white/60">
            هنسيبلك مكانك <span className="num">48</span> ساعة باسم <span className="font-bold text-white">{form.name || "يا بطل"}</span> — تعالي بالكاش لأي كاشير وادّعي برقم العضوية بعد التأكيد.
            <div className="mt-3 rounded-xl border border-line bg-ink px-3 py-2.5 text-xs text-white/50">{GYM.address}</div>
          </div>
        )}

        {/* 3-D Secure */}
        {payPhase === "otp" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gold/40 bg-gold/[.07] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-black text-gold">
              <Lock className="h-4 w-4" /> تحقق البنك الإضافي (3-D Secure)
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-white/55">
              {payMsg || "ادخل الرمز اللي بعتلك إياه البنك على رسالتك."} <span className="text-white/35">·OTP أي 6 أرقام، و000000 بيرفض</span>
            </p>
            <div className="flex gap-2">
              <input
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setPayPhase("idle");
                  setPayMsg("");
                }}
                dir="ltr"
                inputMode="numeric"
                placeholder="••••••"
                className="num w-full rounded-xl border border-line bg-ink px-3.5 py-3 text-left text-lg tracking-[.4em] outline-none focus:border-gold"
              />
              <button
                type="button"
                onClick={verifyOtp}
                className="shrink-0 rounded-xl bg-gold px-5 text-sm font-black text-black transition hover:brightness-110"
              >
                تأكيد
              </button>
            </div>
            <button type="button" onClick={() => { setPayPhase("idle"); setIntent(null); }} className="mt-2 text-[11px] text-white/40 hover:text-white">
              إلغاء والرجوع لاختيار طريقة تانية
            </button>
          </motion.div>
        )}

        {/* فشل / رسالة العملية */}
        {(payPhase === "failed" || errors.pay) && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex items-start gap-2 rounded-xl border border-brand/40 bg-brand/10 px-3.5 py-2.5 text-xs font-bold text-brand-soft">
            <X className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {payMsg || errors.pay}
          </motion.p>
        )}

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/35">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
          بيانات الكارت بتتفحص في المتصفح وعلى السيرفر (Luhn + قرار البنك) ومش بتترسل لأي مكان ولا بتتخزن. عشان تشغيل
          حقيقي: حط مفتاح بوابة الدفع في <span className="num text-white/55">NEXT_PUBLIC_PAYMENT_PROVIDER</span> وبدّل
          جسم <span className="num text-white/55">authorize()</span> في <span className="num text-white/55">app/lib/payment.ts</span>.
        </p>
      </div>
    );
  }

  function DoneStep() {
    const orderId = done?.orderId ?? "";
    const grid = cardPattern(orderId, 7);
    return (
      <div className="space-y-4 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mint/15 text-mint"
        >
          <CircleCheck className="h-8 w-8" />
        </motion.div>
        <div>
          <h4 className="text-xl font-black">أهلاً يا {done?.name?.split(" ")[0] || "بطل"} 👊</h4>
          <p className="mt-1 text-sm text-white/50">
            طلبك اتسجّل وهيبدأ سريانه بعد تأكيد الدفع. رقم الطلب:{" "}
            <span className="num font-black text-white">{orderId}</span>
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface-2 to-ink p-5 text-right">
          <span className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-brand/25 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold text-white/40">FitZone Pro · بطاقة عضو</p>
              <p className="mt-1 text-lg font-black">
                {done?.planName ?? quote.planName}{" "}
                <span className="text-xs font-bold text-white/45">/ {done?.cycleLabel ?? quote.cycleLabel}</span>
              </p>
              <p className="num mt-3 text-xs tracking-[.2em] text-white/60">{orderId}</p>
              <p className="mt-1 text-[11px] text-white/40">
                تنتهي في{" "}
                {done ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(done.endsAt)) : "—"}
              </p>
            </div>
            <div className="grid shrink-0 gap-[2px] rounded-lg bg-white p-1.5" aria-hidden>
              {grid.map((row, r) => (
                <div key={r} className="flex gap-[2px]">
                  {row.map((on, c) => (
                    <span key={c} className={cx("h-[6px] w-[6px]", on ? "bg-ink" : "bg-white")} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { t: "حمّل التطبيق", d: "متابعة التمرينات والحجز" },
            { t: "احجز الـ InBody", d: "أول تحليل بالمجان" },
            { t: "قابل الكوتش", d: "خطة أول أسبوع" },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-line bg-white/[.03] p-3">
              <p className="text-xs font-black">{x.t}</p>
              <p className="mt-0.5 text-[11px] text-white/45">{x.d}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

/* ---------------- helpers ---------------- */
const inputCls = (err?: string) =>
  cx(
    "w-full rounded-xl border bg-ink px-3.5 py-2.5 text-sm outline-none transition placeholder:text-white/25",
    err ? "border-brand/70 focus:border-brand" : "border-line focus:border-brand/70",
  );

function Field({
  label, children, error, className,
}: { label: string; children: React.ReactNode; error?: string; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/45">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] font-bold text-brand-soft">{error}</span>}
    </label>
  );
}

function formatCard(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

function CardPreview({ number, holder, exp, brand, valid }: { number: string; holder: string; exp: string; brand: string; valid: boolean }) {
  const digits = number.replace(/\D/g, "");
  const shown = (digits + "••••••••••••••••").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  return (
    <div className="relative flex h-full min-h-[170px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-dark/60 via-ink to-black p-4">
      <span className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-brand/30 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <span className="h-7 w-10 rounded-md bg-gradient-to-br from-gold to-gold/40" />
        <span className={cx("text-[11px] font-black tracking-widest", valid ? "text-white/70" : "text-brand-soft")}>{brand}</span>
      </div>
      <p className="num relative text-lg font-bold tracking-[.12em] text-white/90">{shown}</p>
      {digits.length > 0 && !valid && <p className="relative text-[10px] font-bold text-brand-soft">رقم غير مطابق لفحص Luhn</p>}
      <div className="relative flex items-end justify-between text-[11px]">
        <div>
          <p className="text-white/35">CARD HOLDER</p>
          <p className="font-bold text-white/80">{holder || "—"}</p>
        </div>
        <div className="text-left">
          <p className="text-white/35">EXPIRES</p>
          <p className="num font-bold text-white/80">{exp || "MM/YY"}</p>
        </div>
      </div>
    </div>
  );
}
