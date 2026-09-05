"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { BadgeCheck, ChevronLeft, ChevronRight, Pause, Play, Quote, Star } from "lucide-react";
import { REVIEWS, TESTIMONIALS } from "@/app/lib/data";
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
                  <span className="flex items-center gap-3 text-[11px] text-white/35">
                    <span className="flex items-center gap-1 text-mint">
                      <BadgeCheck className="h-3.5 w-3.5" /> تقييم موثّق
                    </span>
                    <span>{t.when}</span>
                    <span className="num">
                      {i + 1} / {n}
                    </span>
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

        {/* حائط آراء الأعضاء — زي ريفيوهات قوقل */}
        <div className="mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-xl font-black sm:text-2xl">
              آخر اللي كتبوه الأعضاء <span className="text-white/35">(بأسمائهم الحقيقية)</span>
            </h3>
            <a href="#booking" className="text-xs font-bold text-brand-soft hover:underline">
              جرّب جلسة أولى بالمجان ←
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((r, idx) => (
              <motion.figure
                key={r.name + r.when}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: Math.min(idx * 0.05, 0.3), duration: 0.5 }}
                className={cx(
                  "flex h-full flex-col justify-between rounded-2xl border bg-surface/45 p-4 transition hover:border-white/25",
                  r.rating >= 5 ? "border-line" : "border-line/70",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/70 to-brand-dark text-[11px] font-black">
                        {r.name.charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-black">{r.name}</span>
                        <span className="num block truncate text-[10px] text-white/35">
                          {r.plan} · {r.when}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-px">
                      {Array.from({ length: 5 }).map((_, k) => (
                        <Star key={k} className={cx("h-3 w-3", k < r.rating ? "fill-gold text-gold" : "text-white/15")} />
                      ))}
                    </span>
                  </div>
                  <blockquote className="mt-3 text-[13px] leading-relaxed text-white/70">{r.text}</blockquote>
                </div>
                <figcaption className="mt-3 flex items-center gap-1 border-t border-line pt-2.5 text-[10px] text-white/30">
                  <BadgeCheck className="h-3 w-3 text-mint" /> عضو محقّق · تقييم بعد ٣ شهور على الأقل من الاشتراك
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
