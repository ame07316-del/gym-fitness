"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import { apiFetch, ENDPOINTS } from "@/app/lib/api";
import { cx } from "@/app/lib/utils";

type SessionInfo = { authenticated: boolean; enabled: boolean; devPassword: string | null; sessionHours: number };

/** `next` لازم يكون مسار داخلي — عشان مفيش open redirect */
const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/admin");

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<SessionInfo | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<SessionInfo>(ENDPOINTS.adminSession).then((res) => {
      if (!alive || !res.data) return;
      if (res.data.authenticated) router.replace(next);
      else setInfo(res.data);
    });
    return () => {
      alive = false;
    };
  }, [next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await apiFetch<{ ok: boolean }>(ENDPOINTS.adminSession, { method: "POST", body: { password } });
    if (res.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setError(res.fields?.password && res.status === 422 ? res.fields.password : (res.error ?? "حصل خطأ"));
    setBusy(false);
  };

  const disabled = info ? !info.enabled : false;

  return (
    <motion.div
      suppressHydrationWarning
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-md"
    >
      <div className="glass overflow-hidden rounded-3xl border border-line shadow-[0_40px_120px_-40px_rgba(0,0,0,.9)]">
        <div className="border-b border-line bg-surface/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand-soft ring-1 ring-brand/30">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-white/40">FitZone Pro</p>
              <h1 className="text-xl font-black">لوحة الإدارة</h1>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-6" noValidate>
          {disabled ? (
            <div className="flex items-start gap-3 rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-gold">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                اللوحة مقفولة: ظبّط <span className="num font-black">ADMIN_PASSWORD</span> في متغيرات البيئة وأعد التشغيل.
              </p>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-white/45">كلمة المرور</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    autoComplete="current-password"
                    dir="ltr"
                    aria-invalid={!!error}
                    placeholder="••••••••"
                    className={cx(
                      "w-full rounded-xl border bg-ink py-3 pl-11 pr-10 text-left text-sm outline-none transition placeholder:text-white/25",
                      error ? "border-brand/70" : "border-line focus:border-brand/70",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {error && (
                  <p role="alert" className="mt-1.5 text-xs font-bold text-brand-soft">
                    {error}
                  </p>
                )}
              </label>

              <button
                type="submit"
                disabled={busy || !password}
                className="inline-flex w-full select-none items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-black text-white shadow-[0_12px_36px_-16px_rgba(225,29,46,.9)] transition hover:bg-brand-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {busy ? "جاري التحقق…" : "دخول"}
              </button>

              {info?.devPassword && (
                <div className="rounded-2xl border border-mint/30 bg-mint/10 px-4 py-3 text-xs leading-relaxed text-mint">
                  <p className="font-black">وضع التطوير</p>
                  <p className="mt-0.5 text-mint/80">
                    كلمة المرور الافتراضية: <span className="num font-black text-mint">{info.devPassword}</span> — غيّرها بـ{" "}
                    <span className="num">ADMIN_PASSWORD</span> في <span className="num">.env.local</span>.
                  </p>
                </div>
              )}
            </>
          )}

          <p className="text-center text-[11px] text-white/35">
            الجلسة بتفضل {info?.sessionHours ?? 12} ساعة · 5 محاولات غلط = قفل 10 دقايق
          </p>
        </form>
      </div>

      <Link href="/" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-white/45 transition hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" />
        رجوع للموقع
      </Link>
    </motion.div>
  );
}
