"use client";

import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { ArrowLeft, Play, ShieldCheck, Star, Zap } from "lucide-react";
import { GYM, HERO_IMAGE, STATS, TICKER } from "@/app/lib/data";
import { CountUp, LinkBtn } from "@/app/components/ui/Bits";
import { useGym } from "@/app/lib/store";

export default function GymHero() {
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 700], ["0%", "18%"]);
  const bgScale = useTransform(scrollY, [0, 700], [1.06, 1.22]);
  const textY = useTransform(scrollY, [0, 600], [0, -60]);
  const fade = useTransform(scrollY, [0, 520], [1, 0.15]);
  const { openCheckout } = useGym();

  const words = ["حوّل", "جسمك.", "غيّر", "حياتك."];

  return (
    <section id="home" className="relative flex min-h-[100svh] items-center overflow-hidden pt-24 pb-24">
      {/* الخلفية */}
      <motion.div suppressHydrationWarning className="absolute inset-0 -z-10" style={{ y: bgY }}>
        <motion.div suppressHydrationWarning className="absolute inset-0" style={{ scale: bgScale }}>
          <Image src={HERO_IMAGE} alt="الصالة الرئيسية في FitZone Pro" fill priority sizes="100vw" className="object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-l from-ink via-ink/85 to-ink/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/80" />
        <div className="absolute inset-0 grid-noise opacity-60" />
      </motion.div>

      {/* هالة حمراء */}
      <motion.span suppressHydrationWarning
        aria-hidden
        className="absolute -left-40 top-1/3 -z-10 h-[32rem] w-[32rem] rounded-full bg-brand/25 blur-[130px]"
        animate={{ opacity: [0.5, 0.95, 0.5], scale: [1, 1.12, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div suppressHydrationWarning style={{ y: textY, opacity: fade }} className="mx-auto grid w-full max-w-7xl gap-10 px-4 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        {/* النص */}
        <div>
          <motion.div suppressHydrationWarning
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/12 px-3 py-1.5 text-xs font-bold text-brand-soft">
              <Star className="h-3.5 w-3.5 fill-current" /> أفضل جيم في المنطقة 2026
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70">
              <ShieldCheck className="h-3.5 w-3.5 text-mint" /> جلسة أولى بالمجان
            </span>
          </motion.div>

          <h1 className="mt-5 text-[2.6rem] font-black leading-[1.06] tracking-tight sm:text-6xl lg:text-[4.6rem]">
            {words.map((w, i) => (
              <motion.span suppressHydrationWarning
                key={w + i}
                initial={{ opacity: 0, y: 34, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, delay: 0.12 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={i >= 2 ? "mr-3 inline-block text-brand-soft" : "inline-block"}
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <motion.p suppressHydrationWarning
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="mt-5 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg"
          >
            أكبر مجتمع لياقة في {GYM.address.split("،").pop()}. أحدث الأجهزة، كوتشات معتمدين دولياً، واشتراك تقدر
            تشغّله وتجمّده وتجدّده أونلاين في دقيقة واحدة.
          </motion.p>

          <motion.div suppressHydrationWarning
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68, duration: 0.7 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={() => openCheckout()}
              className="glow group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-brand px-7 py-4 text-base font-black text-white transition hover:bg-brand-soft active:scale-95"
            >
              <Zap className="h-5 w-5" />
              ابدأ اشتراكك الآن
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
            </button>
            <LinkBtn href="#tools" variant="outline" className="py-4 text-base">
              <Play className="h-4 w-4" /> جرّب الحاسبات
            </LinkBtn>
            <LinkBtn href="#gallery" variant="ghost" className="py-4 text-sm underline-offset-4 hover:underline">
              شاهد الجيم بالصور
            </LinkBtn>
          </motion.div>

          <motion.div suppressHydrationWarning
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-9 flex items-center gap-3"
          >
            <div className="flex -space-x-3 space-x-reverse">
              {[11, 32, 45, 60, 15].map((n) => (
                <span key={n} className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-surface-2 text-[10px] font-black text-white/70">
                  {String.fromCharCode(1570 + (n % 20))}
                </span>
              ))}
            </div>
            <p className="text-xs leading-tight text-white/50">
              <span className="num font-black text-white">+1,240</span> عضو انضموا السنة دي
              <br />
              <span className="text-gold">★★★★★</span> <span className="num">4.9</span> من {`(`}
              <span className="num">1,860</span> تقييم
              {`)`}
            </p>
          </motion.div>
        </div>

        {/* كروت الأرقام */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
          {STATS.map((s, i) => (
            <motion.div suppressHydrationWarning
              key={s.label}
              initial={{ opacity: 0, y: 30, rotateX: -12 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.35 + i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="float-anim group relative overflow-hidden rounded-2xl border border-line glass p-5"
              style={{ animationDelay: `${i * 0.45}s` }}
            >
              <span className="absolute -left-6 -top-6 h-16 w-16 rounded-full bg-brand/20 blur-xl transition group-hover:bg-brand/40" />
              <s.icon className="mb-3 h-7 w-7 text-brand-soft transition group-hover:scale-110" />
              <div className="text-3xl font-black tracking-tight sm:text-4xl">
                <CountUp to={s.value} suffix={s.suffix} />
              </div>
              <p className="mt-1 text-xs font-semibold text-white/45">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* شريط متحرك */}
      <div className="marquee-wrap absolute inset-x-0 bottom-0 border-y border-line bg-ink-2/80 py-2.5 backdrop-blur">
        <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-2 text-xs font-bold text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
