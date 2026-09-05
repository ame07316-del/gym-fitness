"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { BadgeCheck, CalendarPlus, ChevronLeft, Heart, Star, Users, VolumeX } from "lucide-react";
import { TRAINERS, type Trainer } from "@/app/lib/data";
import { cx, egp } from "@/app/lib/utils";
import { useGym } from "@/app/lib/store";
import { Chip, Reveal, SectionTitle } from "@/app/components/ui/Bits";
import { Modal } from "@/app/components/ui/Overlay";

export default function Trainers() {
  const { favorites, toggleFavorite, requestBooking } = useGym();
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [openTrainer, setOpenTrainer] = useState<Trainer | null>(null);

  const list = useMemo(() => {
    const base = onlyFavs ? TRAINERS.filter((t) => favorites.includes(t.id)) : TRAINERS;
    return [...base].sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  }, [onlyFavs, favorites]);

  return (
    <section id="trainers" className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <SectionTitle
          kicker="فريق التدريب"
          title={
            <>
              اختار <span className="text-brand-soft">الكابتن</span> اللي هيوصّلك
            </>
          }
          sub="مدربين ومعتمدات دوليين، لكل واحد أسلوبه في التدريب والمتابعة — دوس على الكارت تشوف البرواز الكامل."
        />

        <Reveal className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-white/45">
            <span className="num font-black text-white/70">{TRAINERS.length}</span> كوتش معتمد ·
            <span className="num font-black text-white/70"> 18</span> سنة متوسط الخبرة
          </div>
          <button
            onClick={() => setOnlyFavs((v) => !v)}
            className={cx(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
              onlyFavs ? "border-brand bg-brand/15 text-brand-soft" : "border-line bg-white/5 text-white/60 hover:text-white",
            )}
          >
            <Heart className={cx("h-3.5 w-3.5", onlyFavs && "fill-current")} />
            المفضلين عندي {favorites.length > 0 && <span className="num">({favorites.length})</span>}
          </button>
        </Reveal>

        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-dashed border-line p-8 text-center text-sm text-white/45">
              لسه ما عملتش مفضّلين — اضغط على القلب في أي كوتش.
            </p>
          ) : (
            list.map((t, i) => (
              <Reveal key={t.id} delay={i * 0.07}>
                <motion.article
                  layout
                  whileHover="hover"
                  onClick={() => setOpenTrainer(t)}
                  className="group relative h-full cursor-pointer overflow-hidden rounded-3xl border border-line bg-surface/60 transition hover:border-brand/45"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <motion.div
                      className="absolute inset-0"
                      variants={{ hover: { scale: 1.08 } }}
                      transition={{ type: "spring", stiffness: 220, damping: 26 }}
                    >
                      <Image src={t.image} alt={t.name} fill sizes="(max-width:640px) 92vw, (max-width:1024px) 46vw, 300px" className="object-cover" />
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-transparent" />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(t.id);
                      }}
                      aria-label={favorites.includes(t.id) ? `شيل ${t.name} من المفضلين` : `اضيف ${t.name} للمفضلين`}
                      className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-ink/55 backdrop-blur transition hover:bg-ink/80"
                    >
                      <Heart
                        className={cx(
                          "h-4 w-4 transition",
                          favorites.includes(t.id) ? "scale-110 fill-brand text-brand" : "text-white/80",
                        )}
                      />
                    </button>

                    <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gold px-2 py-1 text-[11px] font-black text-black">
                      <Star className="h-3 w-3 fill-black" /> <span className="num">{t.rating.toFixed(1)}</span>
                    </span>

                    {t.full && (
                      <span className="absolute inset-x-3 bottom-24 flex items-center justify-center gap-1.5 rounded-xl bg-black/70 py-1.5 text-[11px] font-bold text-gold backdrop-blur">
                        <VolumeX className="h-3.5 w-3.5" /> جدول الأسبوع مليان
                      </span>
                    )}

                    <div className="absolute inset-x-4 bottom-4">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-lg font-black leading-tight">{t.name}</h3>
                        <BadgeCheck className="h-4 w-4 shrink-0 text-brand-soft" />
                      </div>
                      <p className="mt-0.5 text-xs text-brand-soft">{t.specialty}</p>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-1.5 pt-4">
                      {t.tags.map((tag) => (
                        <Chip key={tag}>{tag}</Chip>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-white/45">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> <span className="num">{t.clients}</span> متدرب
                      </span>
                      <span>{t.experience}</span>
                      <span className="num font-black text-white/70">{egp(t.price)}</span>
                    </div>
                  </div>
                </motion.article>
              </Reveal>
            ))
          )}
        </motion.div>
      </div>

      <Modal
        open={!!openTrainer}
        onClose={() => setOpenTrainer(null)}
        size="md"
        title={openTrainer?.name ?? ""}
        sub={openTrainer ? `${openTrainer.specialty} · ${openTrainer.experience} خبرة` : ""}
        footer={
          openTrainer && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-white/45">
                سعر الحصة الخاصة <span className="num font-black text-white">{egp(openTrainer.price)}</span> ·{" "}
                <span className="num">{openTrainer.reviews}</span> تقييم
              </span>
              <button
                onClick={() => {
                  setOpenTrainer(null);
                  requestBooking({ trainer: openTrainer.name });
                }}
                className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white transition hover:bg-brand-soft"
              >
                <CalendarPlus className="h-4 w-4" /> احجز مع {openTrainer.name.split(" ")[1] ?? "الكابتن"}
              </button>
            </div>
          )
        }
      >
        {openTrainer && (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl border border-line">
              <Image src={openTrainer.image} alt={openTrainer.name} className="h-56 w-full object-cover" width={800} height={500} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
              <p className="absolute inset-x-4 bottom-3 text-sm leading-relaxed text-white/85">{openTrainer.bio}</p>
            </div>

            <div>
              <h5 className="mb-2 text-xs font-black uppercase tracking-wider text-white/45">مستواه في المجالات</h5>
              <div className="space-y-2.5">
                {openTrainer.skills.map((s, i) => (
                  <div key={s.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-bold text-white/75">{s.label}</span>
                      <span className="num text-white/45">{s.value}٪</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-l from-brand to-brand-soft"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.value}%` }}
                        transition={{ delay: 0.1 + i * 0.09, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h5 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white/45">
                  <BadgeCheck className="h-3.5 w-3.5 text-mint" /> الشهادات
                </h5>
                <ul className="space-y-1.5 text-[13px] text-white/70">
                  {openTrainer.certs.map((c) => (
                    <li key={c} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white/45">
                  <CalendarPlus className="h-3.5 w-3.5 text-brand-soft" /> الأوقات المتاحة
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {openTrainer.slots.map((s) => (
                    <Chip key={s} tone={openTrainer.full ? "neutral" : "mint"}>
                      {s}
                    </Chip>
                  ))}
                </div>
                {openTrainer.full && (
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-gold">
                    <ChevronLeft className="h-3 w-3" /> تقدر تحجز في قائمة الانتظار وهنبعتلك أول ما مكان يفضى.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
