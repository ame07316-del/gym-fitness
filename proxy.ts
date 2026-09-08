import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/app/lib/server/admin-auth";

/**
 * حارس لوحة الإدارة (بيشتغل قبل أي route):
 *   /admin/*      → لو مفيش جلسة صالحة يتحول لـ /admin/login?next=…
 *   /api/admin/*  → 401 JSON (ما عدا session اللي هي نفسها الدخول/الخروج)
 *
 * الـ route handlers بتعيد التحقق برضه (`requireAdmin`) — البروكسي طبقة أولى مش الوحيدة.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const isLogin = pathname === "/admin/login" || pathname === "/api/admin/session";

  const authed = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);

  if (isLogin) {
    // مسجّل بالفعل وفاتح صفحة الدخول؟ ودّيه للوحة على طول
    if (authed && pathname === "/admin/login") return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  if (authed) {
    const res = NextResponse.next();
    // اللوحة ما تتكاشش ولا تتفهرس
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  if (isApi) {
    return NextResponse.json({ error: "غير مصرّح — سجّل دخولك للوحة الإدارة", code: "unauthorized" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
