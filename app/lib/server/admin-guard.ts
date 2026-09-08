import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "./admin-auth";

/** قراءة كوكي من هيدر الطلب مباشرة — عشان الهاندلرز تتختبر بـ `new Request()` من غير سياق Next */
export function readCookie(request: Request, name: string): string | undefined {
  const raw = request.headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export const isAdminRequest = (request: Request) => verifySessionToken(readCookie(request, ADMIN_COOKIE));

/**
 * حارس الـ handlers الإدارية: `proxy.ts` بيصد قبلها، بس بنعيد التحقق هنا برضه
 * (defense in depth — لو حد نادى الـ route من غير ما يعدي على البروكسي).
 */
export async function requireAdmin(request: Request) {
  if (await isAdminRequest(request)) return null;
  return NextResponse.json({ error: "غير مصرّح — سجّل دخولك للوحة الإدارة", code: "unauthorized" }, { status: 401 });
}

/** IP الطالب (خلف Vercel/Nginx بييجي في x-forwarded-for) — لتحديد محاولات الدخول */
export function clientIp(request: Request) {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "local").trim();
}
