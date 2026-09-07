"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { adminFetch } from "@/app/lib/admin-client";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/app/lib/auth/roles";
import type { PublicUser } from "@/app/lib/db/users";

export default function AccountPanel({ user, notify }: { user: PublicUser; notify: (kind: "ok" | "err", text: string) => void }) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFields({});
    if (newPassword !== confirm) {
      setFields({ confirm: "التأكيد مش مطابق" });
      return;
    }
    setBusy(true);
    const res = await adminFetch<{ message: string }>("/api/admin/auth/password", {
      method: "POST",
      body: { currentPassword, newPassword },
    });
    setBusy(false);
    if (res.ok) {
      notify("ok", res.data?.message ?? "اتغيّرت كلمة السر");
      setCurrent("");
      setNext("");
      setConfirm("");
    } else {
      setFields(res.fields ?? {});
      notify("err", res.error ?? "مش قادرين نغيّر كلمة السر");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={submit} className="rounded-2xl border border-line bg-surface/60 p-5">
        <h2 className="mb-4 font-black">تغيير كلمة السر</h2>
        <Field label="كلمة السر الحالية" error={fields.currentPassword}>
          <input type="password" dir="ltr" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} className={input} required autoComplete="current-password" />
        </Field>
        <Field label="كلمة السر الجديدة" error={fields.newPassword}>
          <input type="password" dir="ltr" value={newPassword} onChange={(e) => setNext(e.target.value)} className={input} required autoComplete="new-password" />
        </Field>
        <Field label="تأكيد كلمة السر" error={fields.confirm}>
          <input type="password" dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} required autoComplete="new-password" />
        </Field>
        <p className="mb-4 text-xs text-white/45">10 حروف على الأقل، وفيها رقم. بعد التغيير كل الجلسات التانية بتتقفل.</p>
        <button type="submit" disabled={busy} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-black transition hover:bg-brand-soft disabled:opacity-60">
          حفظ
        </button>
      </form>

      <div className="rounded-2xl border border-line bg-surface/60 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-black">
          <ShieldCheck className="size-4 text-mint" />
          صلاحياتك
        </h2>
        <p className="text-sm text-white/70">
          دورك: <span className="font-black text-gold">{ROLE_LABEL[user.role]}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/55">{ROLE_DESCRIPTION[user.role]}</p>
        <dl className="mt-4 space-y-1.5 text-xs text-white/50">
          <div className="flex justify-between">
            <dt>الإيميل</dt>
            <dd dir="ltr">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt>الحساب اتعمل</dt>
            <dd className="num">{new Date(user.createdAt).toLocaleDateString("ar-EG")}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

const input = "w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm outline-none focus:border-brand/60";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-xs font-bold text-white/70">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-brand-soft">{error}</span>}
    </label>
  );
}
