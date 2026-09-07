"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/app/lib/admin-client";
import { ROLE_LABEL, type Role } from "@/app/lib/auth/roles";

type Entry = {
  id: number;
  at: number;
  actorEmail: string | null;
  actorRole: Role | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
};

const ACTION_LABEL: Record<string, string> = {
  "auth.login": "تسجيل دخول",
  "auth.login_failed": "محاولة دخول فاشلة",
  "auth.logout": "خروج",
  "auth.password_changed": "تغيير كلمة سر",
  "user.created": "إنشاء مستخدم",
  "user.updated": "تعديل مستخدم",
  "user.deleted": "حذف مستخدم",
  "subscription.created": "اشتراك جديد",
  "subscription.status_changed": "تغيير حالة اشتراك",
  "subscription.coach_assigned": "إسناد كوتش",
  "subscription.deleted": "حذف اشتراك نهائيًا",
  "booking.created": "حجز جديد",
  "booking.updated": "تعديل حجز",
  "booking.deleted": "حذف حجز",
};

const stamp = (ts: number) =>
  new Intl.DateTimeFormat("ar-EG", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));

export default function AuditPanel() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await adminFetch<{ items: Entry[] }>("/api/admin/audit?limit=120");
      if (res.ok && res.data) setItems(res.data.items);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="rounded-2xl border border-line bg-surface/60 p-6 text-white/60">بنحمّل السجل…</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface/60">
      <table className="w-full min-w-[760px] text-right text-sm">
        <thead className="border-b border-line text-xs text-white/50">
          <tr>
            <th className="p-3 font-bold">الوقت</th>
            <th className="p-3 font-bold">مين</th>
            <th className="p-3 font-bold">العملية</th>
            <th className="p-3 font-bold">على إيه</th>
            <th className="p-3 font-bold">تفاصيل</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-white/50">
                السجل فاضي.
              </td>
            </tr>
          )}
          {items.map((e) => (
            <tr key={e.id} className="border-b border-line/60 last:border-0">
              <td className="num p-3 text-xs text-white/55">{stamp(e.at)}</td>
              <td className="p-3 text-xs">
                <span dir="ltr" className="text-white/75">
                  {e.actorEmail ?? "زائر"}
                </span>
                {e.actorRole && <span className="mr-2 text-white/40">({ROLE_LABEL[e.actorRole]})</span>}
              </td>
              <td className="p-3 text-xs font-bold">{ACTION_LABEL[e.action] ?? e.action}</td>
              <td className="num p-3 text-xs text-white/60">{e.entityId ?? "—"}</td>
              <td className="p-3 text-[11px] text-white/45" dir="ltr">
                {e.meta ? JSON.stringify(e.meta) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
