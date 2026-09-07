"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, ShieldCheck, TriangleAlert } from "lucide-react";
import { adminFetch } from "@/app/lib/admin-client";
import { ROLE_LABEL, type Role } from "@/app/lib/auth/roles";
import { cx } from "@/app/lib/utils";

type DemoAccount = { email: string; password: string; role: Role };

export default function LoginForm({ next, demoAccounts }: { next: string; demoAccounts: DemoAccount[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const res = await adminFetch<{ ok: boolean }>("/api/admin/auth/login", { method: "POST", body: { email, password } });
    setBusy(false);

    if (!res.ok) {
      setError(res.error ?? "مش قادرين نسجّل دخولك");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-brand/15 text-brand-soft ring-1 ring-brand/30">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-2xl font-black">لوحة إدارة FitZone Pro</h1>
          <p className="mt-1 text-sm text-white/55">الدخول للموظفين المصرّح لهم فقط — كل عملية بتتسجل في سجل العمليات.</p>
        </div>

        <form onSubmit={submit} className="glass rounded-3xl border border-line p-6 shadow-glow">
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-bold text-white/80">الإيميل</span>
            <input
              type="email"
              autoComplete="username"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-line bg-ink-2 px-4 py-3 text-left outline-none transition focus:border-brand/60"
              placeholder="owner@fitzone.pro"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-1.5 block text-sm font-bold text-white/80">كلمة السر</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-ink-2 px-4 py-3 text-left outline-none transition focus:border-brand/60"
              placeholder="••••••••••"
            />
          </label>

          {error && (
            <p className="mb-4 flex items-start gap-2 rounded-xl border border-brand/40 bg-brand/10 px-3 py-2.5 text-sm text-brand-soft">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={cx(
              "flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-black transition",
              busy ? "opacity-60" : "hover:bg-brand-soft",
            )}
          >
            <LogIn className="size-5" />
            {busy ? "بنتحقق…" : "دخول"}
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/40">
            <LockKeyhole className="size-3.5" />
            الجلسة بتنتهي بعد ساعة خمول، والحساب بيتقفل مؤقتًا بعد ٥ محاولات فاشلة.
          </p>
        </form>

        {demoAccounts.length > 0 && (
          <div className="mt-5 rounded-2xl border border-line bg-surface/60 p-4">
            <p className="mb-2 text-xs font-bold text-gold">حسابات العرض (وضع التجربة بس):</p>
            <ul className="space-y-1.5 text-xs text-white/65">
              {demoAccounts.map((a) => (
                <li key={a.email} className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(a.password);
                    }}
                    className="rounded-lg border border-line px-2 py-1 font-mono text-[11px] transition hover:border-brand/50 hover:text-white"
                    dir="ltr"
                  >
                    {a.email} / {a.password}
                  </button>
                  <span className="text-white/45">{ROLE_LABEL[a.role]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
