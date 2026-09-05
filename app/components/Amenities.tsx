"use client";

import React from "react";
import { motion } from "framer-motion";
import { Dumbbell, Snowflake, ShieldCheck, Sparkles, Users, Utensils, Wifi } from "lucide-react";
import { Reveal } from "@/app/components/ui/Bits";

const ITEMS = [
  { icon: Dumbbell, title: "1,200 م² أوزان حرة", text: "32 جهاز قوة + ركن رفع أولمبي بأرضية مطاطية" },
  { icon: Users, title: "صالة سيدات مستقلة", text: "دخول وكوتشات منفصلة من 4 لـ 8 بالليل" },
  { icon: Snowflake, title: "ساونا وثلاجة ثلج", text: "تعافي بعد التمرين + جاكوزي وغرف تبديل" },
  { icon: Utensils, title: "ركن تغذية حي", text: "خطة مصرية بأكل بيتك، بتتحدث كل أسبوع" },
  { icon: ShieldCheck, title: "أمن وجراج أرضي", text: "كاميرات 24 ساعة وأماكن انتظار مغطاة" },
  { icon: Wifi, title: "تطبيق متابعة", text: "شوف تقدمك واحجز كلاساتك من موبايلك" },
  { icon: Sparkles, title: "نظافة كل ساعة", text: "تعقيم الأجهزة والأرضيات على مدار اليوم" },
];

export default function Amenities() {
  return (
    <section id="amenities" className="relative border-y border-line bg-ink-2/70 py-14">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-black sm:text-3xl">
            كل حاجة محتاجها في <span className="text-brand-soft">مكان واحد</span>
          </h2>
          <p className="text-xs text-white/45">مواصفات مش متوفرة في أي جيم تاني في المهندسين</p>
        </Reveal>

        <div className="no-bar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-4 md:overflow-visible md:px-0 xl:grid-cols-7">
          {ITEMS.map((it, i) => (
            <motion.div suppressHydrationWarning
              key={it.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              whileHover={{ y: -6 }}
              className="group w-[74%] shrink-0 snap-start rounded-2xl border border-line bg-surface/50 p-4 transition-colors hover:border-brand/45 sm:w-auto"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/12 text-brand-soft transition group-hover:bg-brand group-hover:text-white">
                <it.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-black leading-snug">{it.title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">{it.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
