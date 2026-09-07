"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, PauseCircle, PlayCircle, Search, Trash2, UserCog } from "lucide-react";
import { adminFetch } from "@/app/lib/admin-client";
import type { Permission } from "@/app/lib/auth/roles";
import type { PublicUser } from "@/app/lib/db/users";
import { cx, egp, fmtShort } from "@/app/lib/utils";

type Sub = {
  orderId: string;
  member: { name: string; phone: string; goal: string | null };
  planName: string;
  cycle: string;
  months: number;
  total: number | null;
  perMonth: number | null;
  coachId: string | null;
  coachName: string | null;
  status: "active" | "frozen" | "cancelled" | "expired";
  createdAt: number;
  endsAt: number;
  cancelReason: string | null;
};

type Payload = { items: Sub[]; total: number; scope: "own" | "all"; coaches: { id: string; name: string }[] };

const STATUS_META: Record<Sub["status"], { label: string; cls: string }> = {
  active: { label: "نشط", cls: "border-mint/40 bg-mint/10 text-mint" },
  frozen: { label: "مجمّد", cls: "border-gold/40 bg-gold/10 text-gold" },
  cancelled: { label: "ملغي", cls: "border-brand/40 bg-brand/10 text-brand-soft" },
  expired: { label: "منتهي", cls: "border-line bg-white/5 text-white/60" },
};

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "active", label: "نشط" },
  { id: "frozen", label: "مجمّد" },
  { id: "cancelled", label: "ملغي" },
  { id: "expired", label: "منتهي" },
] as const;

export default function SubscriptionsPanel({
  user,
  permissions,
  notify,
  onChanged,
}: {
  user: PublicUser;
  permissions: Permission[];
  notify: (kind: "ok" | "err", text: string) => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const has = (p: Permission) => permissions.includes(p);

  const [reload, setReload] = useState(0);
  const load = useCallback(() => setReload((n) => n + 1), []);

  // بحث بتأخير بسيط + إعادة تحميل بعد أي إجراء — كل الـ setState بعد await
  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const params = new URLSearchParams({ status, ...(q.trim() ? { q: q.trim() } : {}) });
        const res = await adminFetch<Payload>(`/api/admin/subscriptions?${params}`);
        if (!alive) return;
        if (res.ok && res.data) setData(res.data);
        setLoading(false);
      })();
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [status, q, reload]);

  async function act(sub: Sub, action: "cancel" | "freeze" | "resume") {
    const labels = { cancel: "إلغاء", freeze: "تجميد", resume: "استئناف" } as const;
    let reason: string | null = null;
    if (action === "cancel") {
      reason = window.prompt(`سبب إلغاء اشتراك ${sub.member.name}؟ (اختياري)`, "");
      if (reason === null) return; // المستخدم لغى
    }
    setBusyId(sub.orderId);
    const res = await adminFetch<{ message: string }>(`/api/admin/subscriptions/${encodeURIComponent(sub.orderId)}`, {
      method: "PATCH",
      body: { action, reason: reason || undefined },
    });
    setBusyId(null);
    if (res.ok) {
      notify("ok", res.data?.message ?? `تم ${labels[action]}`);
      load();
      onChanged();
    } else notify("err", res.error ?? "مش قادرين ننفّذ");
  }

  async function remove(sub: Sub) {
    const typed = window.prompt(
      `⚠️ حذف نهائي لاشتراك ${sub.member.name} (${sub.orderId}).\nالبيانات مش هترجع تاني.\nاكتب رقم الطلب للتأكيد:`,
      "",
    );
    if (typed?.trim().toUpperCase() !== sub.orderId.toUpperCase()) {
      if (typed !== null) notify("err", "رقم الطلب مش مطابق — الحذف اتلغى");
      return;
    }
    setBusyId(sub.orderId);
    const res = await adminFetch<{ message: string }>(`/api/admin/subscriptions/${encodeURIComponent(sub.orderId)}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      notify("ok", res.data?.message ?? "اتمسح");
      load();
      onChanged();
    } else notify("err", res.error ?? "مش قادرين نمسح");
  }

  async function setCoach(sub: Sub, coachId: string) {
    setBusyId(sub.orderId);
    const res = await adminFetch(`/api/admin/subscriptions/${encodeURIComponent(sub.orderId)}`, {
      method: "PATCH",
      body: { coachId: coachId || null },
    });
    setBusyId(null);
    if (res.ok) {
      notify("ok", "اتحدّث الكوتش المسؤول");
      load();
    } else notify("err", res.error ?? "مش قادرين نحفظ");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم أو الموبايل أو رقم الطلب"
            className="w-64 rounded-xl border border-line bg-ink-2 py-2.5 pr-9 pl-3 text-sm outline-none focus:border-brand/60"
          />
        </div>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            className={cx(
              "rounded-xl border px-3 py-2 text-sm transition",
              status === f.id ? "border-brand/50 bg-brand/15 font-bold" : "border-line text-white/60 hover:text-white",
            )}
          >
            {f.label}
          </button>
        ))}
        {data && (
          <span className="mr-auto text-sm text-white/50">
            {data.scope === "own" ? "أعضاؤك المسندون لك" : "كل الأعضاء"} · <span className="num">{data.total}</span>
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface/60">
        <table className="w-full min-w-[900px] text-right text-sm">
          <thead className="border-b border-line text-xs text-white/50">
            <tr>
              <th className="p-3 font-bold">العضو</th>
              <th className="p-3 font-bold">الباقة</th>
              <th className="p-3 font-bold">الحالة</th>
              <th className="p-3 font-bold">ينتهي</th>
              <th className="p-3 font-bold">الكوتش</th>
              {has("revenue:read") && <th className="p-3 font-bold">الإجمالي</th>}
              <th className="p-3 font-bold">إجراءات</th>
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
                  مفيش اشتراكات بالفلتر ده.
                </td>
              </tr>
            )}
            {!loading &&
              data?.items.map((s) => (
                <tr key={s.orderId} className="border-b border-line/60 last:border-0">
                  <td className="p-3">
                    <p className="font-bold">{s.member.name}</p>
                    <p className="num text-xs text-white/50">{s.member.phone}</p>
                    <p className="num text-[11px] text-white/35">{s.orderId}</p>
                  </td>
                  <td className="p-3">
                    <p>{s.planName}</p>
                    <p className="text-xs text-white/50">
                      <span className="num">{s.months}</span> شهر
                    </p>
                  </td>
                  <td className="p-3">
                    <span className={cx("inline-block rounded-lg border px-2 py-1 text-xs font-bold", STATUS_META[s.status].cls)}>
                      {STATUS_META[s.status].label}
                    </span>
                    {s.cancelReason && <p className="mt-1 text-[11px] text-white/40">{s.cancelReason}</p>}
                  </td>
                  <td className="p-3 text-xs text-white/60">{fmtShort(s.endsAt)}</td>
                  <td className="p-3">
                    {has("subscriptions:update") && data.coaches.length > 0 ? (
                      <select
                        value={s.coachId ?? ""}
                        disabled={busyId === s.orderId}
                        onChange={(e) => void setCoach(s, e.target.value)}
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
                      <span className="flex items-center gap-1 text-xs text-white/60">
                        <UserCog className="size-3.5" />
                        {s.coachName ?? "—"}
                      </span>
                    )}
                  </td>
                  {has("revenue:read") && <td className="num p-3 font-bold">{s.total === null ? "—" : egp(s.total)}</td>}
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {has("subscriptions:update") && s.status === "active" && (
                        <ActionBtn onClick={() => void act(s, "freeze")} busy={busyId === s.orderId} icon={PauseCircle} label="تجميد" tone="gold" />
                      )}
                      {has("subscriptions:update") && (s.status === "frozen" || s.status === "cancelled" || s.status === "expired") && (
                        <ActionBtn onClick={() => void act(s, "resume")} busy={busyId === s.orderId} icon={PlayCircle} label="تفعيل" tone="mint" />
                      )}
                      {has("subscriptions:cancel") && s.status !== "cancelled" && (
                        <ActionBtn onClick={() => void act(s, "cancel")} busy={busyId === s.orderId} icon={Ban} label="إلغاء" tone="brand" />
                      )}
                      {has("subscriptions:delete") && (
                        <ActionBtn onClick={() => void remove(s)} busy={busyId === s.orderId} icon={Trash2} label="حذف نهائي" tone="brand" />
                      )}
                      {!has("subscriptions:update") && !has("subscriptions:cancel") && <span className="text-xs text-white/35">للعرض فقط</span>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {user.role === "coach" && (
        <p className="text-xs text-white/45">بتشوف الأعضاء المسندين ليك بس — الفلترة دي بتحصل على السيرفر مش في المتصفح.</p>
      )}
    </div>
  );
}

function ActionBtn({
  onClick,
  busy,
  icon: Icon,
  label,
  tone,
}: {
  onClick: () => void;
  busy: boolean;
  icon: typeof Ban;
  label: string;
  tone: "gold" | "mint" | "brand";
}) {
  const tones = {
    gold: "border-gold/40 text-gold hover:bg-gold/10",
    mint: "border-mint/40 text-mint hover:bg-mint/10",
    brand: "border-brand/40 text-brand-soft hover:bg-brand/10",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cx("flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition disabled:opacity-50", tones[tone])}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
