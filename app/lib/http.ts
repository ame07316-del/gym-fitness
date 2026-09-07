/**
 * مساعدات HTTP مشتركة بين كل الـ route handlers:
 * ردود JSON بترويسات آمنة، قراءة الـ IP، وقراءة جسم الطلب بحد أقصى للحجم.
 */
import { NextResponse } from "next/server";

const BASE_HEADERS = {
  // ردود الـ API مالهاش كاش أبدًا — فيها بيانات أعضاء
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
} as const;

export function json<T>(data: T, init: { status?: number; headers?: Record<string, string>; cookies?: string[] } = {}) {
  const res = NextResponse.json(data, { status: init.status ?? 200 });
  for (const [k, v] of Object.entries({ ...BASE_HEADERS, ...(init.headers ?? {}) })) res.headers.set(k, v);
  for (const c of init.cookies ?? []) res.headers.append("Set-Cookie", c);
  return res;
}

export const errorJson = (message: string, status: number, extra: Record<string, unknown> = {}) =>
  json({ error: message, ...extra }, { status });

export const fieldErrors = (fields: Record<string, string>, message = "بيانات غير صحيحة") =>
  json({ error: message, fields }, { status: 422 });

/** أول IP في x-forwarded-for (أو الهيدرز البديلة) — بيستخدم في الـ rate limit والسجل */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim().slice(0, 45);
  return (
    request.headers.get("x-real-ip")?.slice(0, 45) ??
    request.headers.get("cf-connecting-ip")?.slice(0, 45) ??
    "unknown"
  );
}

const MAX_BODY_BYTES = 32 * 1024; // 32KB أكتر من كفاية لأي فورم عندنا

/** قراءة JSON بأمان: بترجع null لو مش JSON أو أكبر من الحد */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return null;

  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (text.length > MAX_BODY_BYTES) return null;

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/* ============================ تنظيف المدخلات ============================ */

/** نص نظيف: بيشيل محارف التحكم، بيقص المسافات، وبيحدد الطول */
export function cleanText(value: unknown, max = 120): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);
}

export const cleanPhone = (value: unknown) => cleanText(value, 24).replace(/[\s-]/g, "");

export const toInt = (value: unknown, fallback = 0) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
