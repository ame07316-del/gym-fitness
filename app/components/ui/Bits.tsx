"use client";

import React, { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { cx } from "@/app/lib/utils";
import { useHydrated } from "@/app/lib/storage";

/* ---------- كشف عند التمرير ---------- */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
  once = true,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once, margin: "-70px" }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

/* ---------- عدّاد متحرك ---------- */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  decimals = 0,
  duration = 1.8,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const [text, setText] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (reduce) return;
    if (!inView || started.current) return;
    started.current = true;
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setText(v),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  const value = reduce && hydrated ? to : (text ?? 0);
  return (
    <span ref={ref} className={cx("num", className)}>
      {prefix}
      {value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/* ---------- عنوان قسم ---------- */
export function SectionTitle({
  kicker,
  title,
  sub,
  align = "center",
  className,
}: {
  kicker: string;
  title: React.ReactNode;
  sub?: string;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <Reveal className={cx(align === "center" ? "text-center mx-auto" : "text-right", "mb-12 max-w-2xl", className)}>
      <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-bold text-brand-soft">
        <span className="h-1.5 w-1.5 rounded-full bg-brand live-dot" />
        {kicker}
      </span>
      <h2 className="mt-3 text-3xl font-black leading-[1.2] text-white sm:text-4xl md:text-[2.9rem]">{title}</h2>
      {sub && <p className="mt-3 leading-relaxed text-white/55">{sub}</p>}
    </Reveal>
  );
}

/* ---------- شارة صغيرة ---------- */
export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "mint" | "gold";
  className?: string;
}) {
  const tones = {
    neutral: "border-white/12 bg-white/5 text-white/70",
    brand: "border-brand/40 bg-brand/15 text-brand-soft",
    mint: "border-mint/35 bg-mint/12 text-mint",
    gold: "border-gold/35 bg-gold/12 text-gold",
  } as const;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold", tones[tone], className)}>
      {children}
    </span>
  );
}

/* ---------- زر ---------- */
export function Btn({
  children,
  variant = "solid",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "ghost" | "outline" | "gold" }) {
  const styles = {
    solid: "bg-brand text-white hover:bg-brand-soft shadow-[0_12px_36px_-16px_rgba(225,29,46,.9)]",
    gold: "bg-gold text-black hover:brightness-110",
    outline: "border border-white/15 bg-white/5 text-white hover:border-brand/60 hover:bg-brand/10",
    ghost: "text-white/70 hover:text-white hover:bg-white/5",
  } as const;
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45",
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function LinkBtn({
  children,
  variant = "solid",
  className,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: "solid" | "ghost" | "outline" | "gold" }) {
  const styles = {
    solid: "bg-brand text-white hover:bg-brand-soft",
    gold: "bg-gold text-black hover:brightness-110",
    outline: "border border-white/15 bg-white/5 text-white hover:border-brand/60 hover:bg-brand/10",
    ghost: "text-white/70 hover:text-white hover:bg-white/5",
  } as const;
  return (
    <a
      {...rest}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition active:scale-[0.97]",
        styles[variant],
        className,
      )}
    >
      {children}
    </a>
  );
}
