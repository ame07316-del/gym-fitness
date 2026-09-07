"use client";

/**
 * نداءات لوحة الإدارة من المتصفح.
 *
 * — بتضيف توكن الـ CSRF من الكوكي في هيدر `x-csrf-token` (double submit).
 * — `credentials: "same-origin"` عشان كوكي الجلسة تتبعت (وما تتبعتش لأي دومين تاني).
 * — 401 معناها الجلسة خلصت → بنرجّع المستخدم لصفحة الدخول.
 */
export type AdminResult<T> = { ok: boolean; status: number; data: T | null; error: string | null; fields?: Record<string, string> };

function readCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export async function adminFetch<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<AdminResult<T>> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET" && method !== "HEAD") headers["x-csrf-token"] = readCookie("fz_csrf");

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return { ok: false, status: 0, data: null, error: "السيرفر مش بيرد — اتأكد من الاتصال" };
  }

  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    /* رد مش JSON */
  }

  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
    // إعادة تحميل كاملة مقصودة: الجلسة خلصت، فعايزين نرمي كل الحالة اللي في الذاكرة
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
  }

  return {
    ok: res.ok,
    status: res.status,
    data: (json as T | null) ?? null,
    error: res.ok ? null : ((json?.error as string | undefined) ?? `فشل الطلب (${res.status})`),
    fields: (json?.fields as Record<string, string> | undefined) ?? undefined,
  };
}
