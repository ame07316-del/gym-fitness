import { NextResponse, type NextRequest } from "next/server";

/**
 * طبقة الحماية اللي بتشتغل قبل أي صفحة (Next 16: `proxy` بدل `middleware`).
 *
 * بتعمل حاجتين:
 *  1) ترويسات أمان لكل الردود (CSP، nosniff، Referrer-Policy، Permissions-Policy، HSTS).
 *  2) بوابة على `/admin`: من غير كوكي جلسة → تحويل لصفحة الدخول.
 *     ⚠️ ده تحسين تجربة بس — **التحقق الحقيقي على السيرفر** في `authorize()`
 *     و`requireSession()` لأن الكوكي هنا بيتشاف وجودها بس، ومش بيتفك تشفيرها.
 */

const isDev = process.env.NODE_ENV === "development";

/** المعاينات الخارجية (e2b) لازم تقدر تحط الموقع في iframe وقت التطوير بس */
const FRAME_ANCESTORS = isDev ? "'self' https://*.e2b.app" : "'none'";

function buildCsp(nonce: string | null) {
  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`
    : // صفحات الموقع العامة بتترندر ستاتيك، فالـ nonce مش متاح فيها؛
      // بنسمح بالـ inline scripts بتاعة نكست بس مع منع أي دومين خارجي.
      `'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // framer-motion والـ Tailwind بيحطوا ستايلات inline
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${FRAME_ANCESTORS}`,
    "frame-src 'none'",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function withSecurityHeaders(res: NextResponse, request: NextRequest, csp: string) {
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  // clickjacking: CSP هو الأساس، والهيدر القديم للمتصفحات القديمة (بس مش في التطوير عشان المعاينة)
  if (!isDev) res.headers.set("X-Frame-Options", "DENY");
  if (request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminArea = pathname.startsWith("/admin");
  const hasSession = Boolean(request.cookies.get("fz_session")?.value);

  // بوابة الواجهة: أي صفحة أدمن غير صفحة الدخول محتاجة كوكي
  if (isAdminArea && !pathname.startsWith("/admin/login") && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return withSecurityHeaders(NextResponse.redirect(url), request, buildCsp(null));
  }

  // لوحة الأدمن ديناميكية دايمًا → نقدر نستخدم nonce وسياسة أقوى
  const nonce = isAdminArea ? Buffer.from(crypto.randomUUID()).toString("base64") : null;
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  if (nonce) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
  }

  return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), request, csp);
}

export const config = {
  matcher: [
    // كل حاجة ما عدا ملفات نكست الستاتيك والصور والأيقونات
    {
      source: "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
