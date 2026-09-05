"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, Check, Clock, Flame, Plus, Trash2, Users, Zap } from "lucide-react";
import { SCHEDULE } from "@/app/lib/data";
import { cx } from "@/app/lib/utils";
import { useClock } from "@/app/lib/storage";
import { useGym } from "@/app/lib/store";
import { Chip, Reveal, SectionTitle } from "@/app/components/ui/Bits";

const INTENSITY = { 1: "خفيف", 2: "متوسط", 3: "عالي" } as const;

export default function Schedule() {
  const { myClasses, toggleClass, seats, bookSeat } = useGym();
  const { weekday } = useClock();
  const todayIdx = Math.max(0, SCHEDULE.findIndex((d) => d.en === weekday));
  const [picked, setPicked] = useState<number | null>(null);
  const day = picked ?? todayIdx;
  const [view, setView] = useState<"day" | "week">("day");

  const rows = SCHEDULE[day].classes;

  return (
    <section id="schedule" className="relative py-20 sm:py-24">
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-surface/50 to-transparent" />
      <div className="mx-auto max-w-6xl px-4">
        <SectionTitle
          kicker="الجدول"
          title={
            <>
              جدول الكلاسات <span className="text-brand-soft">الأسبوعي</span>
            </>
          }
          sub="احجز مكانك من الويب والمكان يتحفظ في جدولك — تقدر تشيله أو ترجعله في أي وقت من «عضويتي»."
        />

        <Reveal className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-bar flex gap-2 overflow-x-auto pb-1">
            {SCHEDULE.map((d, i) => (
              <button
                key={d.day}
                onClick={() => {
                  setPicked(i);
                  setView("day");
                }}
                className={cx(
                  "relative shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition",
                  day === i && view === "day" ? "text-white" : "bg-surface/60 text-white/50 hover:text-white",
                )}
              >
                {day === i && view === "day" && (
                  <motion.span suppressHydrationWarning layoutId="day-pill" className="absolute inset-0 -z-10 rounded-xl bg-brand" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                )}
                {d.day}
                {i === todayIdx && <span className="mr-1.5 h-1.5 w-1.5 align-middle rounded-full bg-mint inline-block" />}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-line bg-surface/60 p-1 text-xs font-bold">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cx("rounded-lg px-3 py-1.5 transition", view === v ? "bg-white/10 text-white" : "text-white/45 hover:text-white")}
              >
                {v === "day" ? "يوم" : "الأسبوع كامل"}
              </button>
            ))}
          </div>
        </Reveal>

        <AnimatePresence mode="wait">
          <motion.div suppressHydrationWarning
            key={view + day}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2.5"
          >
            {(view === "day"
              ? rows.map((c) => ({ day: SCHEDULE[day].day, cls: c, di: day }))
              : SCHEDULE.flatMap((d, di) => d.classes.map((c) => ({ day: d.day, cls: c, di })))
            ).map(({ day: dLabel, cls, di }) => {
              const key = `${di}|${cls.time}`;
              const delta = seats[key] ?? 0;
              const taken = Math.min(cls.capacity, cls.taken + delta);
              const left = cls.capacity - taken;
              const mine = myClasses.includes(key);
              const pct = (taken / cls.capacity) * 100;
              const full = left <= 0;

              return (
                <motion.div suppressHydrationWarning
                  layout={view === "day"}
                  key={key + cls.name}
                  className={cx(
                    "group relative overflow-hidden rounded-2xl border bg-surface/55 p-4 transition",
                    mine ? "border-brand/55" : "border-line hover:border-white/25",
                  )}
                >
                  <span
                    aria-hidden
                    className={cx("absolute inset-y-0 right-0 w-1", full ? "bg-gold" : left <= 3 ? "bg-brand" : "bg-mint/70")}
                  />
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line bg-ink text-brand-soft transition group-hover:border-brand/40">
                        <cls.icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="flex items-center gap-2 truncate text-base font-black sm:text-lg">
                          {cls.name}
                          {view === "week" && <span className="text-[11px] font-bold text-white/40">{dLabel}</span>}
                        </h4>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/45">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> <span className="num">{cls.time}</span>
                          </span>
                          <span className="text-white/20">|</span>
                          الكابتن {cls.trainer}
                          <span className="text-white/20">|</span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-gold" /> {INTENSITY[cls.intensity]}
                          </span>
                          <span className="text-white/20">|</span>
                          <span className="flex items-center gap-1">
                            <Flame className="h-3 w-3 text-brand-soft" /> <span className="num">{cls.kcal}</span> سعرة
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                      <div className="min-w-[92px] flex-1 sm:w-28 sm:flex-none">
                        <div className="mb-1 flex justify-between text-[10px] text-white/45">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> <span className="num">{taken}</span>/{cls.capacity}
                          </span>
                          <span className={cx("num font-bold", full ? "text-gold" : left <= 3 ? "text-brand-soft" : "text-mint")}>
                            {full ? "مليان" : `${left} فاضي`}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <motion.div suppressHydrationWarning
                            className={cx("h-full rounded-full", full ? "bg-gold" : left <= 3 ? "bg-brand" : "bg-mint")}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </div>

                      {mine ? (
                        <button
                          onClick={() => toggleClass(key, cls.name)}
                          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-brand/50 bg-brand/15 px-3 py-2 text-[11px] font-black text-brand-soft transition hover:bg-brand/25"
                        >
                          <Check className="h-3.5 w-3.5" /> محجوز
                          <Trash2 className="h-3 w-3 opacity-60" />
                        </button>
                      ) : (
                        <button
                          onClick={() => (full ? toggleClass(key, cls.name) : bookSeat(key, `${cls.name} · ${cls.time}`))}
                          className={cx(
                            "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black transition active:scale-95",
                            full ? "border border-line bg-white/5 text-gold hover:bg-white/10" : "bg-brand text-white hover:bg-brand-soft",
                          )}
                        >
                          {full ? <CalendarPlus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          {full ? "قائمة انتظار" : "احجز مكاني"}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <Reveal delay={0.1} className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="mint">
              <Check className="h-3 w-3" /> حجز من الويب = مكان مضمون
            </Chip>
            <Chip tone="gold">
              <Flame className="h-3 w-3" /> الكلاسات اللي بتخلص بيوم قبل الموعد
            </Chip>
          </div>
          <p className="text-xs text-white/45">
            عندك <span className="num font-black text-white">{myClasses.length}</span> كلاس في جدولك
            {myClasses.length > 0 && <span> · اتشال من «عضويتي»</span>}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
