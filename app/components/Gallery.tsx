"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Camera, GripVertical, Maximize2, Sparkles, X } from "lucide-react";
import { GALLERY, GALLERY_FILTERS, TRANSFORMS } from "@/app/lib/data";
import { cx } from "@/app/lib/utils";
import { Chip, Reveal, SectionTitle } from "@/app/components/ui/Bits";

export default function Gallery() {
  const [filter, setFilter] = useState<string>("all");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const shots = GALLERY.filter((s) => filter === "all" || s.cat === filter);
  const close = useCallback(() => setLightbox(null), []);
  const next = useCallback(() => setLightbox((i) => (i === null ? i : (i + 1) % shots.length)), [shots.length]);
  const prev = useCallback(() => setLightbox((i) => (i === null ? i : (i - 1 + shots.length) % shots.length)), [shots.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, close, next, prev]);

  return (
    <section id="gallery" className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <SectionTitle
          kicker="معرض الصور"
          title={
            <>
              ادخل الجيم <span className="text-brand-soft">قبل ما تيجي</span>
            </>
          }
          sub="صور حقيقية من الصالة — دوس على أي صورة تتفتح ملء الشاشة، وتنقّل بالأسهم أو بالسوايب."
        />

        <Reveal className="mb-6 flex flex-wrap items-center justify-center gap-2">
          {GALLERY_FILTERS.map((f) => {
            const count = f.id === "all" ? GALLERY.length : GALLERY.filter((s) => s.cat === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setLightbox(null);
                }}
                className={cx(
                  "rounded-full border px-4 py-2 text-xs font-bold transition",
                  filter === f.id
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface/50 text-white/55 hover:border-white/30 hover:text-white",
                )}
              >
                {f.label}
                <span className={cx("num mr-1.5 text-[10px]", filter === f.id ? "text-white/70" : "text-white/30")}>{count}</span>
              </button>
            );
          })}
        </Reveal>

        <motion.div suppressHydrationWarning layout className="grid auto-rows-[170px] grid-cols-2 gap-3 sm:auto-rows-[215px] md:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {shots.map((s, i) => (
              <motion.button suppressHydrationWarning
                layout
                key={s.title}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.4, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setLightbox(i)}
                className={cx("group relative overflow-hidden rounded-2xl border border-line text-right", s.wide && "col-span-2")}
              >
                <Image
                  src={s.src}
                  alt={s.title}
                  fill
                  sizes="(max-width:768px) 50vw, 25vw"
                  className="object-cover transition duration-700 group-hover:scale-110"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent opacity-80 transition group-hover:opacity-95" />
                <span className="absolute inset-0 bg-brand/0 transition duration-500 group-hover:bg-brand/12" />
                <span className="absolute right-3 top-3 grid h-8 w-8 -translate-y-2 place-items-center rounded-full bg-ink/70 opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
                <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                  <span className="text-xs font-black leading-snug text-white sm:text-sm">{s.title}</span>
                  <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/45 sm:block">{s.cat}</span>
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>

        <TransformSlider />
      </div>

      {/* ---------- Lightbox ---------- */}
      <AnimatePresence>
        {lightbox !== null && shots[lightbox] && (
          <motion.div suppressHydrationWarning
            className="fixed inset-0 z-[115] flex flex-col bg-black/93 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label={shots[lightbox].title}
          >
            <div className="flex items-center justify-between px-4 py-4 text-xs text-white/55">
              <span className="flex items-center gap-2">
                <Camera className="h-4 w-4" /> FitZone Pro · معرض الصور
              </span>
              <span className="num">
                {lightbox + 1} / {shots.length}
              </span>
              <button onClick={close} aria-label="إغلاق الصورة" className="rounded-xl border border-white/15 p-2 transition hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative flex-1 px-3 pb-4 sm:px-16">
              <motion.div suppressHydrationWarning
                key={lightbox}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70) next();
                  if (info.offset.x > 70) prev();
                }}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative mx-auto h-full max-w-5xl cursor-grab overflow-hidden rounded-2xl active:cursor-grabbing"
              >
                <Image src={shots[lightbox].src} alt={shots[lightbox].title} fill sizes="90vw" className="object-contain" draggable={false} />
              </motion.div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="الصورة السابقة"
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/15 bg-ink/60 p-3 transition hover:bg-brand sm:block"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="الصورة التالية"
                className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/15 bg-ink/60 p-3 transition hover:bg-brand sm:block"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>

            <p className="px-4 pb-6 text-center text-sm font-bold text-white/80">{shots[lightbox].title}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ---------------- قبل / بعد — سلايدر بالسحب ---------------- */
function TransformSlider() {
  const [idx, setIdx] = useState(0);
  const [pct, setPct] = useState(52);
  const [touched, setTouched] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const t = TRANSFORMS[idx];

  const moveTo = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // RTL: صورة «قبل» بتبدأ من اليمين
    const ratio = 1 - (clientX - r.left) / r.width;
    setPct(Math.max(2, Math.min(98, Math.round(ratio * 100))));
  };

  return (
    <Reveal className="mt-10 overflow-hidden rounded-3xl border border-line bg-surface/45 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black">
            <Sparkles className="h-5 w-5 text-gold" /> اسحب الخط.. قبل وبعد
          </h3>
          <p className="mt-1 text-xs text-white/45">
            {t.name} · {t.meta} · <span className="num">{t.months}</span> شهور ·{" "}
            <span className="font-bold text-mint">{t.lost}</span>
          </p>
        </div>
        <div className="flex gap-1.5">
          {TRANSFORMS.map((x, i) => (
            <button
              key={x.id}
              onClick={() => {
                setIdx(i);
                setPct(52);
              }}
              className={cx(
                "rounded-xl border px-3 py-1.5 text-[11px] font-bold transition",
                idx === i ? "border-brand bg-brand text-white" : "border-line bg-white/5 text-white/50 hover:text-white",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative aspect-[16/9] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-2xl border border-line"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          setTouched(true);
          moveTo(e.clientX);
        }}
        onPointerMove={(e) => e.buttons === 1 && moveTo(e.clientX)}
      >
        <Image src={t.to} alt={`بعد — ${t.name}`} fill sizes="(max-width:768px) 94vw, 1100px" className="object-cover" draggable={false} />

        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${100 - pct}%)` }}>
          <Image src={t.from} alt={`قبل — ${t.name}`} fill sizes="(max-width:768px) 94vw, 1100px" className="object-cover grayscale-[35%]" draggable={false} />
        </div>

        <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white/80" style={{ right: `${pct}%` }}>
          <span className="absolute inset-y-0 -right-px w-px bg-brand/70 blur-[2px]" />
          <motion.span suppressHydrationWarning
            animate={touched ? { x: 0 } : { x: [0, -7, 7, 0] }}
            transition={touched ? { duration: 0.2 } : { duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
            className="absolute top-1/2 grid h-11 w-11 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full border-2 border-white bg-brand text-white shadow-xl"
          >
            <GripVertical className="h-4 w-4" />
          </motion.span>
          {!touched && (
            <motion.span suppressHydrationWarning
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-white"
            >
              اسحب ←
            </motion.span>
          )}
        </div>

        <span className="absolute right-3 top-3">
          <Chip tone="neutral">قبل</Chip>
        </span>
        <span className="absolute left-3 top-3">
          <Chip tone="mint">بعد {t.months} شهور</Chip>
        </span>
        <span className="num absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/75 px-3 py-1 text-[11px] font-bold text-white/70 backdrop-blur">
          {pct}٪
        </span>
        <p className="absolute inset-x-3 bottom-3 hidden max-w-[46%] text-[11px] font-bold leading-snug text-white/70 sm:block">
          “{t.quote}”
        </p>
      </div>

      <input
        type="range"
        min={2}
        max={98}
        value={pct}
        onChange={(e) => setPct(Number(e.target.value))}
        aria-label="مقدار المقارنة بين قبل وبعد"
        className="mt-4 w-full"
      />
    </Reveal>
  );
}
