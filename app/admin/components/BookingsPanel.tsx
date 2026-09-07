"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { adminFetch } from "@/app/lib/admin-client";
import type { Permission } from "@/app/lib/auth/roles";
import { cx, fmtShort } from "@/app/lib/utils";

type Booking = {
  id: string;
  name: string;
  phone: string;
  goal: string;
  slot: string;
  plan: string;
  coachId: string | null;
  coachName: string | null;
  status: "pending" | "confirmed" | "done" | "no_show" | "cancelled";
  createdAt: number;
};

type Payload = { items: Booking[]; total: number; pending: number; scope: "own" | "all"; coaches: { id: string; name: string }[] };

const STATUS_LABEL: Record<Booking["status"], string> = {
  pending: "في الانتظار",
  confirmed: "مؤكد",
  done: "تمّت",
  no_show: "لم يحضر",
  cancelled: "ملغي",
};

export default function BookingsPanel({
  permissions,
  notify,
  onChanged,
}: {
  permissions: Permission[];
  notify: (kind: "ok" | "err", text: string) => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const has = (p: Permission) => permissions.includes(p);

  const [reload, setReload] = useState(0);
  const load = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await adminFetch<Payload>("/api/admin/bookings");
      if (!alive) return;
      if (res.ok && res.data) setData(res.data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  async function patch(b: Booking, body: Record<string, unknown>) {
    setBusyId(b.id);
    const res = await adminFetch(`/api/admin/bookings/${encodeURIComponent(b.id)}`, { method: "PATCH", body });
    setBusyId(null);
    if (res.ok) {
      notify("ok", "اتحدّث الحجز");
      load();
      onChanged();
    } else notify("err", res.error ?? "مش قادرين نحفظ");
  }

  async function remove(b: Booking) {
    if (!window.confirm(`تمسح حجز ${b.name}؟`)) return;
    setBusyId(b.id);
    const res = await adminFetch(`/api/admin/bookings/${encodeURIComponent(b.id)}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      notify("ok", "اتمسح الحجز");
      load();
      onChanged();
    } else notify("err", res.error ?? "مش قادرين نمسح");
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface/60">
      <table className="w-full min-w-[820px] text-right text-sm">
        <thead className="border-b border-line text-xs text-white/50">
          <tr>
            <th className="p-3 font-bold">الاسم</th>
            <th className="p-3 font-bold">الموبايل</th>
            <th className="p-3 font-bold">الهدف / الميعاد</th>
            <th className="p-3 font-bold">الكوتش</th>
            <th className="p-3 font-bold">الحالة</th>
            <th className="p-3 font-bold">التاريخ</th>
            {has("bookings:delete") && <th className="p-3 font-bold" />}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-white/50">
                بنحمّل…
              </td>
            </tr>
          )}
          {!loading && data?.items.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-white/50">
                مفيش حجوزات.
              </td>
            </tr>
          )}
          {!loading &&
            data?.items.map((b) => (
              <tr key={b.id} className="border-b border-line/60 last:border-0">
                <td className="p-3 font-bold">{b.name}</td>
                <td className="num p-3 text-white/70">{b.phone}</td>
                <td className="p-3 text-white/70">
                  {b.goal} · {b.slot}
                </td>
                <td className="p-3">
                  {has("bookings:read") && has("bookings:update") && data.coaches.length > 0 ? (
                    <select
                      value={b.coachId ?? ""}
                      disabled={busyId === b.id}
                      onChange={(e) => void patch(b, { coachId: e.target.value || null })}
                      className="rounded-lg border border-line bg-ink-2 px-2 py-1.5 text-xs outline-none focus:border-brand/60"
                    >
                      <option value="">— بدون —</option>
                      {data.coaches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-white/60">{b.coachName ?? "—"}</span>
                  )}
                </td>
                <td className="p-3">
                  {has("bookings:update") ? (
                    <select
                      value={b.status}
                      disabled={busyId === b.id}
                      onChange={(e) => void patch(b, { status: e.target.value })}
                      className={cx(
                        "rounded-lg border bg-ink-2 px-2 py-1.5 text-xs font-bold outline-none",
                        b.status === "done" ? "border-mint/40 text-mint" : b.status === "pending" ? "border-gold/40 text-gold" : "border-line",
                      )}
                    >
                      {Object.entries(STATUS_LABEL).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs">{STATUS_LABEL[b.status]}</span>
                  )}
                </td>
                <td className="p-3 text-xs text-white/55">{fmtShort(b.createdAt)}</td>
                {has("bookings:delete") && (
                  <td className="p-3">
                    <button
                      onClick={() => void remove(b)}
                      disabled={busyId === b.id}
                      className="rounded-lg border border-brand/40 p-1.5 text-brand-soft transition hover:bg-brand/10 disabled:opacity-50"
                      aria-label="حذف الحجز"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
