"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Power, Trash2, UserPlus } from "lucide-react";
import { adminFetch } from "@/app/lib/admin-client";
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLES, type Permission, type Role } from "@/app/lib/auth/roles";
import type { PublicUser } from "@/app/lib/db/users";
import { cx, fmtShort } from "@/app/lib/utils";

type Payload = { items: PublicUser[]; canManage: boolean };

const EMPTY_FORM = { name: "", email: "", phone: "", role: "coach" as Role, trainerSlug: "", password: "" };

export default function UsersPanel({
  me,
  permissions,
  notify,
}: {
  me: PublicUser;
  permissions: Permission[];
  notify: (kind: "ok" | "err", text: string) => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const canManage = permissions.includes("users:manage");

  const [reload, setReload] = useState(0);
  const load = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await adminFetch<Payload>("/api/admin/users");
      if (!alive) return;
      if (res.ok && res.data) setData(res.data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    const res = await adminFetch<{ message: string }>("/api/admin/users", { method: "POST", body: form });
    setBusy(false);
    if (res.ok) {
      notify("ok", res.data?.message ?? "اتعمل المستخدم");
      setForm(EMPTY_FORM);
      load();
    } else {
      setFields(res.fields ?? {});
      notify("err", res.error ?? "مش قادرين نعمل المستخدم");
    }
  }

  async function patch(u: PublicUser, body: Record<string, unknown>, okText: string) {
    setBusy(true);
    const res = await adminFetch(`/api/admin/users/${u.id}`, { method: "PATCH", body });
    setBusy(false);
    if (res.ok) {
      notify("ok", okText);
      load();
    } else notify("err", res.error ?? Object.values(res.fields ?? {})[0] ?? "مش قادرين نحفظ");
  }

  async function resetPassword(u: PublicUser) {
    const password = window.prompt(`كلمة سر مؤقتة لـ ${u.name} (10 حروف على الأقل + رقم):`, "");
    if (!password) return;
    await patch(u, { password }, "اتغيّرت كلمة السر، والمستخدم هيغيّرها أول دخول");
  }

  async function remove(u: PublicUser) {
    if (!window.confirm(`تمسح حساب ${u.name} (${u.email}) نهائيًا؟`)) return;
    setBusy(true);
    const res = await adminFetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      notify("ok", "اتمسح الحساب");
      load();
    } else notify("err", res.error ?? "مش قادرين نمسح");
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <form onSubmit={create} className="rounded-2xl border border-line bg-surface/60 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-black">
            <UserPlus className="size-4 text-brand-soft" />
            مستخدم جديد
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="الاسم" error={fields.name}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} required />
            </Field>
            <Field label="الإيميل" error={fields.email}>
              <input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} required />
            </Field>
            <Field label="الموبايل (اختياري)" error={fields.phone}>
              <input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
            </Field>
            <Field label="الدور" error={fields.role}>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={input}>
                {ROLES.filter((r) => r !== "owner" || me.role === "owner").map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
            {form.role === "coach" && (
              <Field label="معرّف البروفايل في الموقع (ahmed / sara …)">
                <input dir="ltr" value={form.trainerSlug} onChange={(e) => setForm({ ...form, trainerSlug: e.target.value })} className={input} />
              </Field>
            )}
            <Field label="كلمة سر مؤقتة" error={fields.password}>
              <input
                type="text"
                dir="ltr"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={input}
                placeholder="10 حروف + رقم"
                required
              />
            </Field>
          </div>
          <p className="mt-3 text-xs text-white/45">{ROLE_DESCRIPTION[form.role]}</p>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-black transition hover:bg-brand-soft disabled:opacity-60"
          >
            إنشاء الحساب
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface/60">
        <table className="w-full min-w-[860px] text-right text-sm">
          <thead className="border-b border-line text-xs text-white/50">
            <tr>
              <th className="p-3 font-bold">الاسم</th>
              <th className="p-3 font-bold">الإيميل</th>
              <th className="p-3 font-bold">الدور</th>
              <th className="p-3 font-bold">الحالة</th>
              <th className="p-3 font-bold">آخر دخول</th>
              {canManage && <th className="p-3 font-bold">إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-white/50">
                  بنحمّل…
                </td>
              </tr>
            )}
            {!loading &&
              data?.items.map((u) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0">
                  <td className="p-3">
                    <p className="font-bold">
                      {u.name}
                      {u.id === me.id && <span className="mr-2 text-xs text-white/40">(أنت)</span>}
                    </p>
                    {u.trainerSlug && <p className="text-xs text-white/40">{u.trainerSlug}</p>}
                  </td>
                  <td className="p-3 text-white/70" dir="ltr">
                    {u.email}
                  </td>
                  <td className="p-3">
                    {canManage && u.id !== me.id ? (
                      <select
                        value={u.role}
                        disabled={busy}
                        onChange={(e) => void patch(u, { role: e.target.value }, "اتغيّر الدور، وجلسات المستخدم اتقفلت")}
                        className="rounded-lg border border-line bg-ink-2 px-2 py-1.5 text-xs outline-none focus:border-brand/60"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold text-gold">{ROLE_LABEL[u.role]}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={cx(
                        "rounded-lg border px-2 py-1 text-xs font-bold",
                        u.active ? "border-mint/40 bg-mint/10 text-mint" : "border-line bg-white/5 text-white/50",
                      )}
                    >
                      {u.active ? "نشط" : "موقوف"}
                    </span>
                    {u.mustChangePassword && <p className="mt-1 text-[11px] text-gold">لازم يغيّر كلمة السر</p>}
                  </td>
                  <td className="p-3 text-xs text-white/55">{u.lastLoginAt ? fmtShort(u.lastLoginAt) : "لسه مدخلش"}</td>
                  {canManage && (
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => void resetPassword(u)}
                          disabled={busy}
                          className="flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-xs transition hover:border-white/30 disabled:opacity-50"
                        >
                          <KeyRound className="size-3.5" />
                          كلمة سر
                        </button>
                        {u.id !== me.id && (
                          <>
                            <button
                              onClick={() => void patch(u, { active: !u.active }, u.active ? "الحساب اتوقف" : "الحساب اترجّع")}
                              disabled={busy}
                              className="flex items-center gap-1 rounded-lg border border-gold/40 px-2 py-1.5 text-xs text-gold transition hover:bg-gold/10 disabled:opacity-50"
                            >
                              <Power className="size-3.5" />
                              {u.active ? "إيقاف" : "تفعيل"}
                            </button>
                            <button
                              onClick={() => void remove(u)}
                              disabled={busy}
                              className="flex items-center gap-1 rounded-lg border border-brand/40 px-2 py-1.5 text-xs text-brand-soft transition hover:bg-brand/10 disabled:opacity-50"
                            >
                              <Trash2 className="size-3.5" />
                              حذف
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r} className="rounded-2xl border border-line bg-surface/40 p-4">
            <p className="font-black text-gold">{ROLE_LABEL[r]}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">{ROLE_DESCRIPTION[r]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const input = "w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm outline-none focus:border-brand/60";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-white/70">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-brand-soft">{error}</span>}
    </label>
  );
}
