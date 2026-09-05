"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, Quote, Star } from "lucide-react";
import { TESTIMONIALS } from "@/app/lib/data";
import { cx } from "@/app/lib/utils";
import { SectionTitle } from "@/app/components/ui/Bits";

export default function Testimonials() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const n = TESTIMONIALS.length;
  const x = useMotionValue(0);
  const arrow = useTransform(x, [-140, 0, 140], [1, 0, 1]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setTimeout(() => setI((v) => (v + 1) % n), 6000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [i, playing, n]);

  const go = (d: number) => setI((v) => (v + d + n) % n);
  const t = TESTIMONIALS[i];

  return (
    <section id="stories" className="relative overflow-hidden py-20 sm:py-24">
      <span aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-[130px]" />
      <div className="mx-auto max-w-5xl px-4">
        <SectionTitle
          kicker="قصص نجاح"
          title={
            <>
              أرقام حقيقية، <span className="text-brand-soft">مش كلام إعلاني</span>
            </>
          }
          sub="اسحب الكارت على الموبايل أو استخدم الأسهم — وقصص الأعضاء بتتبدل لوحدها."
        />

        <div className="relative" onMouseEnter={() => setPlaying(false)} onMouseLeave={() => setPlaying(true)}>
          <Quote className="absolute -top-4 right-2 h-16 w-16 -scale-x-100 text-white/[.06]" />

          <div className="overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.article
                key={i}
                drag="x"
                style={{ x }}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.16}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) go(1);
                  else if (info.offset.x > 60) go(-1);
                }}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
                className="cursor-grab select-none rounded-3xl border border-line bg-surface/60 p-6 backdrop-blur active:cursor-grabbing sm:p-9"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-lg font-black">
                      {t.name.charAt(0)}
                    </span>
                    <div>
                      <h4 className="text-base font-black">{t.name}</h4>
                      <p className="text-[11px] text-white/45">{t.role}</p>
                    </div>
                  </div>
                  <span className="rounded-xl border border-mint/30 bg-mint/10 px-3 py-1.5 text-xs font-black text-mint">{t.result}</span>
                </div>

                <p className="mt-5 text-lg font-bold leading-relaxed text-white/85 sm:text-xl">“{t.text}”</p>

                <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                  <div className="flex gap-0.5" aria-label={`${t.rating} من 5`}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className={cx("h-4 w-4", s < t.rating ? "fill-gold text-gold" : "text-white/20")} />
                    ))}
                  </div>
                  <span className="num text-[11px] text-white/35">
                    {i + 1} / {n}
                  </span>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex flex-1 gap-1.5">
              {TESTIMONIALS.map((_, d) => (
                <button
                  key={d}
                  onClick={() => setI(d)}
                  aria-label={`قصة ${d + 1}`}
                  className="group relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                >
                  <span className={cx("h-full rounded-full transition-all duration-300", d === i ? "bg-brand" : "bg-transparent group-hover:bg-white/25")} />
                  {d === i && playing && (
                    <motion.span
                      className="absolute inset-y-0 right-0 bg-brand/60"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 6, ease: "linear" }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "إيقاف العرض" : "تشغيل العرض"} className="rounded-xl border border-line bg-white/5 p-2 text-white/55 transition hover:text-white">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <motion.button onClick={() => go(-1)} aria-label="السابق" style={{ opacity: arrow }} className="rounded-xl border border-line bg-white/5 p-2 text-white/55 transition hover:border-brand/50 hover:text-white">
                <ChevronRight className="h-4 w-4" />
              </motion.button>
              <motion.button onClick={() => go(1)} aria-label="التالي" style={{ opacity: arrow }} className="rounded-xl border border-line bg-white/5 p-2 text-white/55 transition hover:border-brand/50 hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
