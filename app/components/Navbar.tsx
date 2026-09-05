"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Bell, CalendarCheck, Dumbbell, Menu, X } from "lucide-react";
import { GYM, NAV } from "@/app/lib/data";
import { cx } from "@/app/lib/utils";
import { useClock, useHydrated } from "@/app/lib/storage";
import { useGym } from "@/app/lib/store";

export default function Navbar() {
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.3 });
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState("home");
  const hydrated = useHydrated();
  const { hour } = useClock();
  const now = hydrated && hour >= 0 ? { hour, open: hour >= GYM.hours.open && hour < GYM.hours.close } : null;
  const { membership, daysLeft, hasMembership, setPanelOpen, openCheckout } = useGym();

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  // حالة "مفتوح دلوقتي" بتوقيت القاهرة
  // تنبيه لطيف قبل انتهاء العضوية
  const alerts = hasMembership && daysLeft <= 7 ? 1 : 0;

  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <motion.div suppressHydrationWarning
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-right bg-gradient-to-l from-brand via-brand-soft to-gold"
        style={{ scaleX: bar }}
        aria-hidden
      />
      <header
        className={cx(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          solid ? "glass border-b border-line py-1.5" : "border-b border-transparent py-3",
        )}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4">
          <button onClick={() => go("home")} className="group flex items-center gap-2.5" aria-label="FitZone Pro — الرئيسية">
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-brand sheen">
              <Dumbbell className="h-5 w-5 text-white transition duration-500 group-hover:rotate-[-18deg]" />
            </span>
            <span className="text-lg font-black tracking-tight">
              FitZone <span className="text-brand-soft">Pro</span>
            </span>
          </button>

          <div className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className={cx(
                  "relative rounded-lg px-3 py-2 text-sm font-bold transition",
                  active === n.id ? "text-white" : "text-white/55 hover:text-white",
                )}
              >
                {n.label}
                {active === n.id && (
                  <motion.span suppressHydrationWarning
                    layoutId="nav-active"
                    className="absolute inset-x-2 -bottom-0.5 h-[3px] rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {now && (
              <span className="hidden items-center gap-1.5 rounded-full border border-line bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white/70 sm:inline-flex">
                <span className={cx("h-1.5 w-1.5 rounded-full live-dot", now.open ? "bg-mint" : "bg-gold")} />
                {now.open ? "مفتوح دلوقتي" : "مقفل — يفتح ٦ الصبح"}
              </span>
            )}

            <button
              onClick={() => setPanelOpen(true)}
              className={cx(
                "relative hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition sm:inline-flex",
                hasMembership ? "border-mint/40 bg-mint/10 text-mint hover:bg-mint/20" : "border-line bg-white/5 text-white/70 hover:text-white",
              )}
            >
              {hasMembership ? `عضويتي · ${daysLeft} يوم` : "ابدأ عضويتك"}
             {alerts > 0 && <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-ink" />}
            </button>

            <button
              onClick={() => {
                setPanelOpen(false);
                openCheckout();
              }}
              className="hidden rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white transition hover:bg-brand-soft md:inline-flex"
            >
              اشترك الآن
            </button>

            <button
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "قفل القائمة" : "فتح القائمة"}
              aria-expanded={open}
              className="rounded-xl border border-line bg-white/5 p-2.5 lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div suppressHydrationWarning
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden lg:hidden"
            >
              <div className="glass mx-3 mb-3 mt-2 rounded-2xl border border-line p-2">
                {NAV.map((n, i) => (
                  <motion.button suppressHydrationWarning
                    key={n.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i }}
                    onClick={() => go(n.id)}
                    className={cx(
                      "flex w-full items-center justify-between rounded-xl px-4 py-3 text-right text-sm font-bold transition",
                      active === n.id ? "bg-brand/15 text-brand-soft" : "text-white/70 hover:bg-white/5",
                    )}
                  >
                    {n.label}
                    <span className="num text-xs text-white/25">{String(i + 1).padStart(2, "0")}</span>
                  </motion.button>
                ))}
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line p-2">
                  <button
                    onClick={() => {
                      setOpen(false);
                      setPanelOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white/5 px-3 py-2.5 text-xs font-bold"
                  >
                    <Bell className="h-4 w-4" /> عضويتي
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      openCheckout();
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2.5 text-xs font-black"
                  >
                    <CalendarCheck className="h-4 w-4" /> احجز مجاناً
                  </button>
                </div>
                <p className="px-4 pb-1 pt-2 text-center text-[11px] text-white/35">
                  {membership ? `عضوية ${membership.planName} — تنتهي بعد ${daysLeft} يوم` : GYM.address}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
