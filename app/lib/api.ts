/**
 * نقطة الخروج الوحيدة لكل نداءات الباك إند.
 *
 * — لو `BACKEND_URL` (في next.config) أو `NEXT_PUBLIC_API_BASE` متظبطين:
 *    الكلام بيروّح للباك إند بتاعك على طول.
 * — لو مش متظبطين: بيتستخدم الـ Route Handlers المحلية (وضع التجربة).
 *
 * فاللي بيتغير عند ربط Laravel/Node حقيقي هو ملف البيئة بس، مش الكود.
 */
const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");

export const HAS_EXTERNAL_BACKEND = BASE.length > 0;

export function apiUrl(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  return BASE ? `${BASE}${path}` : path;
}

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  fields?: Record<string, string>;
};

type FetchInit = Omit<RequestInit, "body"> & { body?: unknown };

/** fetch موحّد: JSON in/out + رسائل الخطأ العربية الجاية من السيرفر */
export async function apiFetch<T = unknown>(path: string, init: FetchInit = {}): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  try {
    const res = await fetch(apiUrl(path), {
      ...init,
      headers,
      body: init.body === undefined ? undefined : init.body instanceof FormData ? (init.body as FormData) : JSON.stringify(init.body),
    });

    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
    } catch {
      /* سيرفر رجع HTML (صفحة 500 مثلاً) — نتعامل معاه كخطأ عام */
    }

    const message =
      (typeof json?.error === "string" && json.error) ||
      (typeof json?.message === "string" && json.message) ||
      (res.ok ? null : `فشل الطلب (${res.status})`);

    return {
      ok: res.ok,
      status: res.status,
      data: json ? (json as unknown as T) : null,
      error: res.ok ? null : ((message as string | null) ?? "حصل خطأ غير متوقع"),
      fields: (json?.fields as Record<string, string> | undefined) ?? undefined,
    };
  } catch (e) {
    console.error("[api]", path, e);
    return { ok: false, status: 0, data: null, error: HAS_EXTERNAL_BACKEND ? "الباك إند مش بيرد — اتأكد إن السيرفر شغال" : "السيرفر المحلي مش متاح" };
  }
}

/** مسارات الـ API المتفق عليها مع الباك إند */
export const ENDPOINTS = {
  bookings: "/api/bookings",
  subscribe: "/api/subscribe",
  pay: "/api/pay",
  payConfirm: "/api/pay/confirm",
} as const;
