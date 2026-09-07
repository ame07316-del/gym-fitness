"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Banknote, Check, CircleCheck, Copy, LoaderCircle, X,
  PartyPopper, Phone, ShieldCheck, Sparkles, Wallet,
} from "lucide-react";
import { ADDONS, GOALS, GYM, PAY_METHODS, PAY_TARGETS, TIME_SLOTS, type PayMethodId } from "@/app/lib/data";

const ADDON_LOOKUP = Object.fromEntries(ADDONS.map((a) => [a.id, a]));
import { cx, egp, isEGPhone } from "@/app/lib/utils";
import { useGym } from "@/app/lib/store";
import { cardPattern } from "@/app/lib/subscription";
import { Modal } from "@/app/components/ui/Overlay";
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
  const [pay, setPay] = useState<PayMethodId>("wallet");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [wallet, setWallet] = useState("");
  const [done, setDone] = useState<null | {
    orderId: string;
    endsAt: number;
    planName: string;
    cycleLabel: string;
    total: number;
    perMonth: number;
    name: string;
    payment: PayMethodId;
  }>(null);

  const step = checkout.step;

  /**
   * تصفير النافذة عند القفل — مش عن طريق `useEffect`.
   * الـ effect كان بينده setState وقت الفتح، وده بيعمل رندرات متتالية (وبيكسر
   * قاعدة react-hooks/set-state-in-effect). التصفير مكانه الطبيعي هو حدث القفل،
   * والـ store أصلاً بيرجّع الخطوة لصفر في `openCheckout`.
   */
  const close = () => {
    setDone(null);
    setErrors({});
    setPayMsg("");
    setLoading(false);
    closeCheckout();
  };

  const submitLead = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e.name = "اكتب اسمك كما في البطاقة";
    if (!isEGPhone(form.phone)) e.phone = "مثال صحيح: 01012345678";
    setErrors(e);
    if (Object.keys(e).length === 0) setCheckoutStep(2);
    else toast({ kind: "error", title: "راجع البيانات", body: "فيه خانة أو اتنين محتاجة تعديل." });
  };

  /**
   * إرسال الطلب: بنبعت اختيار الباقة وبيانات العضو بس.
   * **مفيش أي مبلغ بيتبعت من المتصفح** — السيرفر بيحسب الإجمالي وبيرجّعه.
   */
  const submitOrder = async () => {
    if (pay === "wallet" && wallet.replace(/\D/g, "").length < 11) {
      setErrors({ pay: "اكتب رقم المحفظة (11 رقم) عشان نطابق بيه التحويل" });
      toast({ kind: "error", title: "رقم المحفظة ناقص" });
      return;
    }
    setErrors({});
    setPayMsg("");
    setLoading(true);

    const rec = await confirmSubscription({
      planId: draft.planId,
      cycle: draft.cycle,
      addonIds: draft.addonIds,
      coupon: draft.coupon,
      member: { name: form.name.trim(), phone: form.phone.trim(), goal: form.goal },
      payment: pay,
      paymentRef: pay === "wallet" ? wallet.replace(/\D/g, "").slice(0, 15) : null,
    });

    setLoading(false);
    if (!rec) {
      setPayMsg("مش قادرين نسجّل الطلب دلوقتي — راجع بياناتك أو كلّمنا على واتساب.");
      return;
    }

    setDone({
      orderId: rec.orderId,
      endsAt: rec.endsAt,
      planName: rec.planName,
      cycleLabel: quote.cycleLabel,
      total: rec.total,
      perMonth: rec.perMonth,
      name: form.name.trim() || "بطل",
      payment: pay,
    });
    setCheckoutStep(3);
  };

  return (
    <Modal
      open={checkout.open}
      onClose={close}
      size="lg"
      title={step === 3 ? "تم تسجيل طلبك 🎉" : "إكمال الاشتراك"}
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
                close();
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
              onClick={() => (step === 0 ? close() : setCheckoutStep(step - 1))}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white/55 transition hover:bg-white/5 hover:text-white"
            >
              {step === 0 ? "إلغاء" : <><ArrowRight className="h-4 w-4" /> رجوع</>}
            </button>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-white/40 sm:block">
                الخطوة <span className="num font-black text-white">{step + 1}</span> من 3
              </span>
              <button
                onClick={step === 0 ? () => setCheckoutStep(1) : step === 1 ? submitLead : submitOrder}
                disabled={loading}
                className="group flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-black text-white transition hover:bg-brand-soft active:scale-95 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" /> جاري تسجيل الطلب…
                  </>
                ) : step === 2 ? (
                  <>
                    أكّد الطلب <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                  </>
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
        <motion.div suppressHydrationWarning
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        >
          {/*
            بنناديهم كدوال (`ReviewStep()`) مش ككومبوننتات (`<ReviewStep />`) عن قصد.
            دول معرّفين جوّه `Checkout`، يعني بياخدوا هوية جديدة مع كل رندر — ولو
            اترسموا كعناصر JSX هيبقى نوعهم اتغيّر فـ React هيعمل unmount + mount
            للشجرة كلها مع كل ضغطة زرار، والـ input يفقد الفوكس بعد كل حرف.
            مفيش أي hook جواهم فالنداء المباشر آمن وبيخلي محتواهم جزء من رندر Checkout.
          */}
          {step === 0 && ReviewStep()}
          {step === 1 && LeadStep()}
          {step === 2 && PayStep()}
          {step === 3 && DoneStep()}
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
            <button onClick={close} className="text-xs font-bold text-brand-soft hover:underline">
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
    return (
      <div className="space-y-4">
        {/* الفاتورة النهائية — بتتأكد على السيرفر قبل التسجيل */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface/50 px-4 py-3">
          <span className="text-xs text-white/50">
            المطلوب دفعه · {quote.cycleLabel}
          </span>
          <span className="num text-lg font-black text-brand-soft">{egp(quote.total)}</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {PAY_METHODS.map((m) => {
            const Icon = m.id === "wallet" ? Wallet : Banknote;
            const on = pay === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setPay(m.id);
                  setErrors({});
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

        {pay === "wallet" && (
          <div className="rounded-2xl border border-line bg-surface/50 p-4 text-sm leading-relaxed text-white/60">
            حوّل <span className="num font-black text-white">{egp(quote.total)}</span> على محفظة الجيم، واكتب رقمك عشان نطابق بيه التحويل:
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PAY_TARGETS.map((w) => (
                <button
                  key={w.name}
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(w.value);
                    toast({ kind: "info", title: "اتنسخ", body: `${w.name}: ${w.value}` });
                  }}
                  className="flex items-center justify-between rounded-xl border border-line bg-ink px-3 py-2.5 text-right transition hover:border-brand/50"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white/50">
                    <Copy className="h-3 w-3" /> {w.name}
                  </span>
                  <span className="num text-sm font-black">{w.value}</span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Field label="رقم المحفظة اللي هتحوّل منها" error={errors.pay}>
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

        {pay === "cash" && (
          <div className="rounded-2xl border border-line bg-surface/50 p-4 text-sm text-white/60">
            هنسيبلك مكانك <span className="num">48</span> ساعة باسم <span className="font-bold text-white">{form.name || "يا بطل"}</span> — تعالى بالكاش لأي كاشير
            وقول رقم الطلب، والعضوية هتتفعّل على طول بعد الدفع.
            <div className="mt-3 rounded-xl border border-line bg-ink px-3 py-2.5 text-xs text-white/50">{GYM.address}</div>
          </div>
        )}

        {(payMsg || errors.pay) && (
          <motion.p suppressHydrationWarning initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex items-start gap-2 rounded-xl border border-brand/40 bg-brand/10 px-3.5 py-2.5 text-xs font-bold text-brand-soft">
            <X className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {payMsg || errors.pay}
          </motion.p>
        )}

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/35">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
          الموقع <span className="font-bold text-white/60">مابيقبلش دفع بالفيزا أو أي كارت</span> ومابيطلبش منك أي بيانات بنكية أبدًا. الإجمالي بيتحسب على
          السيرفر، والعضوية بتتفعّل بعد ما الإدارة تأكد استلام الفلوس.
        </p>
      </div>
    );
  }

  function DoneStep() {
    const orderId = done?.orderId ?? "";
    const grid = cardPattern(orderId, 7);
    return (
      <div className="space-y-4 text-center">
        <motion.div suppressHydrationWarning
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
            {done?.payment === "cash"
              ? "طلبك اتسجّل — تعالى ادفع كاش في الفرع خلال 48 ساعة والعضوية هتتفعّل."
              : "طلبك اتسجّل — أول ما نأكد التحويل هتتفعّل العضوية على طول."}{" "}
            رقم الطلب: <span className="num font-black text-white">{orderId}</span>
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
