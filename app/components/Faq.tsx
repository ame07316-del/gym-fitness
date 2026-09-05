"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, CircleQuestionMark, MessageCircleQuestionMark, Search, X } from "lucide-react";
import { FAQS, GYM } from "@/app/lib/data";
import { cx } from "@/app/lib/utils";
import { Reveal, SectionTitle } from "@/app/components/ui/Bits";

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim();
    if (!needle) return FAQS;
    return FAQS.filter((f) => f.q.includes(needle) || f.a.includes(needle));
  }, [q]);

  return (
    <section id="faq" className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4">
        <SectionTitle
          kicker="أسئلة شائعة"
          title={
            <>
              كل اللي <span className="text-brand-soft">هتسأل عنه</span> قبل الاشتراك
            </>
          }
        />

        <Reveal className="mb-5">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="دوّر في الأسئلة… (مثال: تجميد، دفع، سيدات)"
              className="w-full rounded-2xl border border-line bg-surface/60 py-3.5 pr-11 pl-11 text-sm outline-none transition placeholder:text-white/30 focus:border-brand"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="مسح البحث" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </Reveal>

        <div className="space-y-2.5">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center">
              <MessageCircleQuestionMark className="mx-auto h-7 w-7 text-white/25" />
              <p className="mt-3 text-sm font-bold">مفيش نتيجة للبحث ده</p>
              <a href={`https://wa.me/${GYM.whatsapp}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-black">
                <CircleQuestionMark className="h-3.5 w-3.5" /> اسألنا على واتساب
              </a>
            </div>
          ) : (
            list.map((f, i) => {
              const id = FAQS.indexOf(f);
              const isOpen = open === id;
              return (
                <Reveal key={f.q} delay={Math.min(i * 0.04, 0.3)}>
                  <div className={cx("overflow-hidden rounded-2xl border bg-surface/50 transition", isOpen ? "border-brand/45" : "border-line hover:border-white/25")}>
                    <button
                      id={`faq-q-${id}`}
                      aria-controls={`faq-a-${id}`}
                      onClick={() => setOpen(isOpen ? null : id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 p-4 text-right"
                    >
                      <span className="flex items-start gap-3">
                        <span className={cx("num mt-0.5 text-[11px] font-black transition", isOpen ? "text-brand-soft" : "text-white/25")}>
                          {String(id + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-bold sm:text-base">{f.q}</span>
                      </span>
                      <ChevronDown className={cx("h-4 w-4 shrink-0 text-white/45 transition duration-300", isOpen && "rotate-180 text-brand-soft")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={`faq-a-${id}`}
                          role="region"
                          aria-labelledby={`faq-q-${id}`}
                          suppressHydrationWarning
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <p className="px-4 pb-4 pr-11 text-sm leading-relaxed text-white/60">{f.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reveal>
              );
            })
          )}
        </div>

        <Reveal delay={0.1} className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-gradient-to-l from-brand/10 to-transparent p-5">
          <div>
            <p className="text-sm font-black">لسه عندك سؤال؟</p>
            <p className="mt-0.5 text-xs text-white/50">الفريق بيرد في خلال 10 دقايق في مواعيد العمل.</p>
          </div>
          <div className="flex gap-2">
            <a href={`https://wa.me/${GYM.whatsapp}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-mint px-4 py-2.5 text-xs font-black text-black transition hover:brightness-110">
              واتساب
            </a>
            <a href={`tel:${GYM.whatsapp}`} className="rounded-xl border border-line bg-white/5 px-4 py-2.5 text-xs font-bold transition hover:bg-white/10">
              اتصال
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
