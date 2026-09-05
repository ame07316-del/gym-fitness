"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { GYM, NAV, PLANS } from "@/app/lib/data";
import { cx } from "@/app/lib/utils";
import { useGym } from "@/app/lib/store";
import { useToast } from "@/app/components/ui/Toast";

const SOCIALS = [
  {
    name: "إنستجرام",
    href: GYM.instagram,
    path: "M12 2.2c3.2 0 3.6 0 4.9.07 3.3.15 4.8 1.7 4.95 4.95.06 1.27.07 1.65.07 4.88s0 3.6-.07 4.88c-.15 3.23-1.64 4.8-4.95 4.95-1.27.07-1.65.07-4.9.07s-3.6 0-4.88-.07c-3.3-.15-4.8-1.7-4.95-4.95C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.88C2.42 3.9 3.9 2.4 7.12 2.27 8.4 2.2 8.8 2.2 12 2.2Zm0 3.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2Zm0 2.1a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm6.9-2.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z",
  },
  { name: "فيسبوك", href: GYM.facebook, path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.75-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" },
  { name: "تيك توك", href: GYM.tiktok, path: "M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.58-2.58c.27 0 .53.04.78.12v-3.1a5.7 5.7 0 0 0-.78-.06A5.68 5.68 0 1 0 13.45 15V7.4a7.35 7.35 0 0 0 4.3 1.38V5.7c-.54 0-1.06-.14-1.55-.38l.4.5Z" },
  { name: "يوتيوب", href: GYM.youtube, path: "M23 12s0-3.6-.46-5.32a2.77 2.77 0 0 0-1.95-1.96C18.87 4.25 12 4.25 12 4.25s-6.87 0-8.59.47A2.77 2.77 0 0 0 1.46 6.7C1 8.42 1 12 1 12s0 3.6.46 5.32c.25.94.97 1.67 1.95 1.96 1.72.45 8.59.45 8.59.45s6.87 0 8.59-.47a2.77 2.77 0 0 0 1.95-1.95C23 15.6 23 12 23 12Zm-13 3.42V8.6l5.83 3.4-5.83 3.42Z" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const toast = useToast();
  const { openCheckout, requestBooking } = useGym();

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) {
      setErr("اكتب إيميل صحيح (مثال: name@mail.com)");
      return;
    }
    setErr("");
    setEmail("");
    toast({ kind: "success", title: "تم تسجيل إيميلك 📬", body: "هتبعتلك برنامج الأسبوع وخطة تغذية مجانية." });
  };

  return (
    <footer id="contact" className="relative border-t border-line bg-black/60 pt-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 pb-12 md:grid-cols-2 lg:grid-cols-4">
          {/* براند */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-sm font-black">FZ</span>
              <span className="text-xl font-black">
                FitZone <span className="text-brand-soft">Pro</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              من 1996 وإحنا بنغيّر قوام الناس في المهندسين والدقي. أجهزة جديدة، مدربين معتمدين، واشتراك إلكتروني يتدارك
              من موبايلك.
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  title={s.name}
                  className="group grid h-10 w-10 place-items-center rounded-xl border border-line bg-white/[.03] transition hover:border-brand/60 hover:bg-brand/10"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-white/60 transition group-hover:fill-brand-soft" width="18" height="18" aria-hidden>
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* روابط */}
          <div>
            <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-white/45">روابط سريعة</h4>
            <ul className="space-y-2.5 text-sm">
              {NAV.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} className="group inline-flex items-center gap-2 text-white/55 transition hover:text-white">
                    <span className="h-1 w-1 rounded-full bg-brand transition-all group-hover:w-3" />
                    {n.label}
                  </a>
                </li>
              ))}
              <li>
                <button onClick={() => requestBooking({}, true)} className="inline-flex items-center gap-2 text-white/55 transition hover:text-white">
                  <span className="h-1 w-1 rounded-full bg-brand" /> احجز جلسة تجريبية
                </button>
              </li>
            </ul>
          </div>

          {/* الاشتراكات + بيانات الفرع */}
          <div>
            <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-white/45">الاشتراكات</h4>
            <ul className="space-y-2 text-sm">
              {PLANS.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <button onClick={() => openCheckout(p.id)} className="text-white/55 transition hover:text-brand-soft">
                    باقة {p.name}
                  </button>
                  <span className="num text-xs text-white/35">{p.monthly} ج.م</span>
                </li>
              ))}
            </ul>
            <ul className="mt-5 space-y-2.5 text-sm text-white/55">
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
                <span>
                  كل يوم <span className="num">6 ص – 12 م</span> · الجمعة من <span className="num">10 ص</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" /> {GYM.address}
              </li>
            </ul>
          </div>

          {/* تواصل + نشرة */}
          <div>
            <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-white/45">تواصل معنا</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href={`tel:${GYM.whatsapp}`} className="flex items-center gap-2 text-white/55 transition hover:text-white">
                  <Phone className="h-4 w-4 text-brand-soft" /> <span className="num">{GYM.phone}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${GYM.email}`} className="flex items-center gap-2 text-white/55 transition hover:text-white">
                  <Mail className="h-4 w-4 text-brand-soft" /> {GYM.email}
                </a>
              </li>
              <li>
                <a href={GYM.maps} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/55 transition hover:text-white">
                  <Navigation className="h-4 w-4 text-brand-soft" /> افتح في الخرائط
                </a>
              </li>
            </ul>

            <form onSubmit={subscribe} className="mt-5">
              <p className="mb-2 text-xs font-bold text-white/45">اشترك في نشرة البرنامج المجانية</p>
              <div className="flex gap-2">
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErr("");
                  }}
                  dir="ltr"
                  placeholder="name@mail.com"
                  aria-label="البريد الإلكتروني"
                  className={cx(
                    "w-full rounded-xl border bg-white/[.03] px-3 py-2.5 text-sm outline-none transition placeholder:text-white/25",
                    err ? "border-brand/70" : "border-line focus:border-brand/70",
                  )}
                />
                <motion.button whileTap={{ scale: 0.94 }} type="submit" className="shrink-0 rounded-xl bg-brand px-4 text-sm font-black transition hover:bg-brand-soft">
                  اشترك
                </motion.button>
              </div>
              {err && <p className="mt-1 text-[11px] font-bold text-brand-soft">{err}</p>}
            </form>
          </div>
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-[11px] text-white/35 sm:flex-row sm:text-right">
          <p>© {new Date().getFullYear()} FitZone Pro — جميع الحقوق محفوظة.</p>
          <p className="flex items-center gap-3">
            <a href="#faq" className="transition hover:text-white/70">الشروط والأحكام</a>
            <span className="text-white/15">|</span>
            <a href="#faq" className="transition hover:text-white/70">سياسة الاسترجاع</a>
            <span className="text-white/15">|</span>
            <span>صُنع في الجيزة 🔥</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

export function FloatingActions() {
  const [show, setShow] = useState(false);
  const { quote, openCheckout, hasMembership } = useGym();

  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 620);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* زر واتساب عائم */}
      <motion.a
        href={`https://wa.me/${GYM.whatsapp}?text=${encodeURIComponent("عايز أستفسر عن الاشتراكات 🏋️")}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل على واتساب"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: show ? 1 : 0, opacity: show ? 1 : 0 }}
        whileHover={{ scale: 1.08 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="fixed bottom-24 left-4 z-[95] grid h-13 w-13 place-items-center rounded-full bg-[#25D366] p-3.5 text-black shadow-[0_18px_40px_-12px_rgba(37,211,102,.6)] sm:bottom-6"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden>
          <path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.4 5.2 4.6 2.6 1 3.1.8 3.7.8.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5 0-.2-.2-.3-.5-.4Z" />
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
        </svg>
      </motion.a>

      {/* زر العودة للأعلى */}
      <motion.button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="ارجع لفوق"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: show ? 1 : 0, opacity: show ? 1 : 0 }}
        whileHover={{ scale: 1.08, y: -2 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="fixed bottom-24 right-4 z-[95] grid place-items-center rounded-full border border-line bg-ink-2/90 p-3.5 text-white/70 backdrop-blur transition hover:border-brand/60 hover:text-white sm:bottom-6"
      >
        <ArrowUp className="h-5 w-5" />
      </motion.button>

      {/* شريط الاشتراك العائم للموبايل */}
      {!hasMembership && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: show ? 0 : 80 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-[94] border-t border-line bg-ink-2/95 px-4 py-3 backdrop-blur md:hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] text-white/45">
                باقة {quote.planName} · {quote.cycleLabel}
              </p>
              <p className="num text-sm font-black text-white">
                {Math.round(quote.total)} <span className="text-[11px] font-bold text-white/45">ج.م</span>
                {quote.saved > 0 && <span className="mr-2 text-[10px] font-bold text-mint">وفّر {Math.round(quote.saved)}</span>}
              </p>
            </div>
            <button onClick={() => openCheckout()} className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-black text-white active:scale-95">
              اشترك الآن
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}
