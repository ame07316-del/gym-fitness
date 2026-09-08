"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type ApiResult } from "@/app/lib/api";

type Snapshot<T> = { path: string; data: T | null; error: string | null; at: number };

/**
 * جلب بيانات الأدمن مع: تحميل، خطأ، إعادة تحميل يدوي، وتحديث تلقائي اختياري.
 * لو السيرفر رجّع 401 (الجلسة خلصت) بنودّي المستخدم لصفحة الدخول.
 *
 * الـ loading مشتق (من غير setState متزامن جوه الـ effect):
 *   — آخر رد وصل لمسار غير المطلوب حاليًا → لسه بنحمّل
 *   — أو المستخدم طلب تحديث (`requestedAt`) بعد آخر رد
 */
export function useAdminData<T>(path: string, { refreshMs = 0 }: { refreshMs?: number } = {}) {
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot<T> | null>(null);
  const [requestedAt, setRequestedAt] = useState(0);

  const reload = useCallback(() => setRequestedAt(Date.now()), []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const res: ApiResult<T> = await apiFetch<T>(path, { cache: "no-store" });
      if (!alive) return; // المستخدم غيّر البحث/الصفحة قبل ما الرد يوصل
      if (res.status === 401) {
        router.replace(`/admin/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      if (res.ok && res.data) {
        setSnap({ path, data: res.data, error: null, at: Date.now() });
      } else {
        // بنحافظ على آخر بيانات ناجحة لنفس المسار ونعرض الخطأ جنبها
        setSnap((s) => ({ path, data: s?.path === path ? s.data : null, error: res.error ?? "تعذّر تحميل البيانات", at: Date.now() }));
      }
    };

    void run();
    if (!refreshMs) return () => void (alive = false);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, refreshMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [path, requestedAt, refreshMs, router]);

  const fresh = snap?.path === path;
  return {
    // بنسيب البيانات القديمة معروضة لحد ما الجديدة توصل (من غير وميض)
    data: snap?.data ?? null,
    error: fresh ? snap.error : null,
    loading: !fresh || snap.at < requestedAt,
    updatedAt: fresh ? snap.at : null,
    reload,
  };
}

/** يبني query string من كائن (بيتجاهل الفاضي) */
export function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** تأخير القيمة (للبحث أثناء الكتابة) */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}
