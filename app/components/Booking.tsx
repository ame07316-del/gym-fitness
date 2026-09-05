"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check, CircleCheck, Download, LoaderCircle, Phone, Send, Sparkles, UserRound, X,
} from "lucide-react";
import { GYM, GOALS, PLANS, TIME_SLOTS } from "@/app/lib/data";
import { cx, isEGPhone } from "@/app/lib/utils";
import { useGym } from "@/app/lib/store";
import { Reveal, SectionTitle } from "@/app/components/ui/Bits";
import { useToast } from "@/app/components/ui/Toast";

const EMPTY = { name: "", phone: "", goal: GOALS[0], slot: TIME_SLOTS[3].id, plan: "pro", notes: "" };

export default function Booking() {
  const { addBooking, setPanelOpen, hasMembership } = useGym();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | { id: string }>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onPrefill = (e: Event) => {
      const detail = (e as CustomEvent<{ goal?: string; trainer?: string }>).detail ?? {};
      setForm((f) => ({
        ...f,
        goal: detail.goal ?? f.goal,
        notes: detail.trainer && !f.notes.includes(detail.trainer) ? `${f.notes ? f.notes + " — " : ""}أفضل التدريب مع ${detail.trainer}` : f.notes,
      }));
      if (detail.trainer) {
        toast({ kind: "info", title: "حطينا الكابتن في ملاحظاتك", body: `الكابتن ${detail.trainer.replace("كابتن ", "")}` });
      }
    };
    window.addEventListener("fz:booking", onPrefill);
    return () => window.removeEventListener("fz:booking", onPrefill);
  }, [toast]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const waText = useMemo(
    () =>
      encodeURIComponent(
        `عايز أحجز جلسة تجريبية مجانية.\nالاسم: ${form.name || "—"}\nالموبايل: ${form.phone || "—"}\nالهدف: ${form.goal}\nالوقت: ${TIME_SLOTS.find((t) => t.id === form.slot)?.label}\nالباقة المهتم بيها: ${PLANS.find((p) => p.id === form.plan)?.name}`,
      ),
    [form],
  );

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e.name = "اكتب اسمك بالكامل (3 أحرف على الأقل)";
    if (!isEGPhone(form.phone)) e.phone = "رقم موبايل مصري غلط — مثال: 01012345678";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast({ kind: "error", title: "راجع البيانات", body: "الاسم أو رقم الموبايل غير صحيح." });
      if (errors.name) nameRef.current?.focus();
      return;
    }
    setSending(true);
    const rec = await addBooking({
      name: form.name.trim(),
      phone: form.phone.replace(/\s|-/g, ""),
      goal: form.goal,
      slot: TIME_SLOTS.find((t) => t.id === form.slot)?.label ?? "أي وقت",
      plan: PLANS.find((p) => p.id === form.plan)?.name ?? "برو",
    });
    setSending(false);
    if (rec) {
      setDone({ id: rec.id });
      setForm(EMPTY);
    }
  };

  const downloadIcs = () => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    const stamp = (x: Date) => x.toISOString().replace(/[-:]\d{2}\.\d{3}Z$/, "").replace(/[-]/g, "");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FitZone Pro//Trial Session//AR",
      "BEGIN:VEVENT",
      `UID:${done?.id ?? "fz"}@fitzone.pro`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(d)}`,
      `DTEND:${stamp(new Date(d.getTime() + 90 * 60000))}`,
      "SUMMARY:جلسة تجريبية FitZone Pro",
      `DESCRIPTION:كود الحجز ${done?.id ?? ""}`,
      `LOCATION:${GYM.address}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitzone-trial-${done?.id ?? ""}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ kind: "success", title: "اتنزّل التقويم", body: "افتح الملف عشان تضيف الجلسة لتقويمك." });
  };

  return (
    <section id="booking" className="relative py-20 sm:py-24">
      <span aria-hidden className="absolute inset-x-8 top-16 -z-10 h-72 rounded-[3rem] bg-brand/12 blur-[100px]" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 lg:grid-cols-[.95fr_1.05fr] lg:items-start">
          {/* يسار: الوعد */}
          <Reveal className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/15 via-surface to-ink p-6 sm:p-8">
              <SectionTitle
                align="start"
                kicker="الجلسة الأولى بالمجان"
                title={
                  <>
                    تعال جرّب قبل <span className="text-brand-soft">ما تدفع جنيه</span>
                  </>
                }
                className="mb-6"
              />
              <ul className="space-y-3">
                {[
                  { t: "تمرين كامل 45 دقيقة", d: "مع كوتش هيقيس مستواك ويظبط الأوزان" },
                  { t: "تحليل InBody + قياسات", d: "تقرير عضلات ودهون ومياه مطبوع" },
                  { t: "جولة في الصالة", d: "الأوزان، الكارديو، الساونا، وصالة السيدات" },
                  { t: "خطة أول أسبوع", d: "تمارين وأكل واقعي على يومك ومشوارك" },
                ].map((x) => (
                  <li key={x.t} className="flex items-start gap-3 rounded-2xl border border-line bg-ink/40 p-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand/20 text-brand-soft">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span>
                      <span className="block text-sm font-black">{x.t}</span>
                      <span className="block text-[11px] text-white/50">{x.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5 text-[11px] text-white/50">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                من غير بطاقة ائتمان · من غير التزام · إلغاء الحجز بضغطة
              </div>
              {hasMembership && (
                <button onClick={() => setPanelOpen(true)} className="mt-4 w-full rounded-xl border border-mint/35 bg-mint/10 py-2.5 text-xs font-black text-mint transition hover:bg-mint/20">
                  أنت عضو بالفعل — احجز كلاساتك من لوحة العضوية
                </button>
              )}
            </div>
          </Reveal>

          {/* يمين: الفورم */}
          <Reveal delay={0.08}>
            <div className="relative overflow-hidden rounded-3xl border border-line bg-surface/60 p-6 backdrop-blur sm:p-8">
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div suppressHydrationWarning key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-6 text-center">
                    <motion.span suppressHydrationWarning initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mint/15 text-mint">
                      <CircleCheck className="h-8 w-8" />
                    </motion.span>
                    <h3 className="mt-4 text-2xl font-black">طلبك وصل يا بطل 💪</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/55">
                      هنكلمك على رقمك خلال ساعة في مواعيد العمل نأكد الموعد. كود الحجز:{" "}
                      <span className="num font-black text-white">{done.id}</span>
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      <button onClick={downloadIcs} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-black transition hover:bg-brand-soft">
                        <Download className="h-4 w-4" /> أضف للتقويم
                      </button>
                      <a href={`https://wa.me/${GYM.whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2.5 text-xs font-bold transition hover:bg-white/10">
                        <Phone className="h-4 w-4 text-mint" /> تابع على واتساب
                      </a>
                      <button onClick={() => setDone(null)} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-white/60 transition hover:text-white">
                        <X className="h-4 w-4" /> حجز تاني
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form suppressHydrationWarning key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black">احجز الجلسة المجانية</h3>
                      <span className="num rounded-lg border border-line bg-white/5 px-2 py-1 text-[10px] text-white/45">
                        3 خانات
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="الاسم بالكامل" error={errors.name} icon={UserRound}>
                        <input
                          ref={nameRef}
                          value={form.name}
                          onChange={(e) => set("name", e.target.value)}
                          aria-invalid={!!errors.name}
                          placeholder="مثال: سارة محمود"
                          className={inputCls(!!errors.name)}
                          autoComplete="name"
                        />
                      </Field>
                      <Field label="موبايل / واتساب" error={errors.phone}>
                        <input
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          aria-invalid={!!errors.phone}
                          dir="ltr"
                          inputMode="tel"
                          placeholder="01012345678"
                          className={cx(inputCls(!!errors.phone), "text-left")}
                          autoComplete="tel"
                        />
                      </Field>
                    </div>

                    <div>
                      <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-white/45">إيه هدفك الأساسي؟</p>
                      <div className="flex flex-wrap gap-1.5">
                        {GOALS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => set("goal", g)}
                            className={cx(
                              "rounded-xl border px-3 py-2 text-[11px] font-bold transition active:scale-95",
                              form.goal === g ? "border-brand bg-brand/15 text-white" : "border-line bg-white/[.03] text-white/50 hover:text-white",
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-white/45">أفضل وقت عندك</p>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {TIME_SLOTS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => set("slot", t.id)}
                            className={cx(
                              "rounded-xl border px-2 py-2.5 text-[11px] font-bold transition",
                              form.slot === t.id ? "border-mint bg-mint/12 text-mint" : "border-line bg-white/[.03] text-white/50 hover:text-white",
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field label="الباقة اللي ناوي تشترك فيها">
                      <select value={form.plan} onChange={(e) => set("plan", e.target.value)} className={inputCls()}>
                        {PLANS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.monthly} ج.م / شهر
                          </option>
                        ))}
                        <option value="unknown">لسه بشوف</option>
                      </select>
                    </Field>

                    <Field label="ملاحظات (اختياري)">
                      <textarea
                        value={form.notes}
                        onChange={(e) => set("notes", e.target.value)}
                        rows={2}
                        placeholder="إصابات، عمليات، أو كابتن معين عايز تتدرب معاه…"
                        className={cx(inputCls(), "resize-none")}
                      />
                    </Field>

                    <div className="flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] leading-relaxed text-white/40">
                        بالضغط على “إرسال” أنت موافق إننا نتواصل معاك على الرقم ده لتأكيد الموعد.
                      </p>
                      <div className="flex gap-2">
                        <a
                          href={`https://wa.me/${GYM.whatsapp}?text=${waText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-line bg-white/5 px-4 py-3 text-xs font-bold transition hover:bg-white/10"
                        >
                          واتساب
                        </a>
                        <button
                          type="submit"
                          disabled={sending}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-black text-white transition hover:bg-brand-soft active:scale-95 disabled:opacity-60 sm:flex-none"
                        >
                          {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {sending ? "جاري الإرسال…" : "احجز مجاناً"}
                        </button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const inputCls = (bad = false) =>
  cx(
    "w-full rounded-xl border bg-ink px-3.5 py-3 text-sm outline-none transition placeholder:text-white/25",
    bad ? "border-brand/70" : "border-line focus:border-brand/70",
  );

function Field({
  label, children, error, icon: Icon,
}: { label: string; children: React.ReactNode; error?: string; icon?: typeof UserRound }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/45">
        {Icon && <Icon className="h-3.5 w-3.5 text-brand-soft" />}
        {label}
      </span>
      {children}
      <AnimatePresence>
        {error && (
          <motion.span suppressHydrationWarning initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 block text-[11px] font-bold text-brand-soft">
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  );
}
