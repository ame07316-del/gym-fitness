/**
 * حارس الـ API: مين ده؟ ومسموح له بإيه؟
 *
 * كل route بيعدّل داتا لازم يبدأ بـ:
 *     const guard = await authorize(request, "subscriptions:cancel");
 *     if (!guard.ok) return guard.response;
 *
 * الحارس بيعمل بالترتيب:
 *  1) قراءة الجلسة من الكوكي (وبيرفض لو المستخدم اتعطّل أو الجلسة انتهت).
 *  2) فحص CSRF لأي method بتغيّر حالة (POST/PATCH/PUT/DELETE):
 *     — لو فيه Origin لازم يطابق الـ Host (منع طلبات من دومين تاني).
 *     — لازم هيدر x-csrf-token مطابق للتوكن المربوط بالجلسة.
 *  3) فحص الصلاحية المطلوبة حسب دور المستخدم.
 */
import { clientIp, errorJson } from "../http";
import { can, isScopedToOwn, type Permission } from "./roles";
import { CSRF_HEADER, csrfMatches, parseCookies, resolveSession, SESSION_COOKIE, type AuthContext } from "./session";

export type Guard = { ok: true; ctx: AuthContext; ip: string } | { ok: false; response: Response };

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // مفيش Origin (مثلاً same-origin GET أو استدعاء من اختبار) → بنعتمد على توكن الـ CSRF
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function authorize(request: Request, permission?: Permission): Promise<Guard> {
  const ip = clientIp(request);
  const cookies = parseCookies(request);
  const raw = cookies[SESSION_COOKIE];

  const ctx = resolveSession(raw);
  if (!ctx) {
    return { ok: false, response: errorJson("محتاج تسجّل دخول الأول", 401, { code: "unauthenticated" }) };
  }

  if (MUTATING.has(request.method.toUpperCase())) {
    if (!originAllowed(request)) {
      return { ok: false, response: errorJson("الطلب جاي من مصدر غير موثوق", 403, { code: "bad_origin" }) };
    }
    const header = request.headers.get(CSRF_HEADER);
    if (!header || !csrfMatches(raw!, header)) {
      return { ok: false, response: errorJson("توكن الحماية (CSRF) ناقص أو غير صحيح — اعمل تحديث للصفحة", 403, { code: "csrf" }) };
    }
  }

  if (permission && !can(ctx.user.role, permission)) {
    return { ok: false, response: errorJson("الصلاحية دي مش متاحة لدورك", 403, { code: "forbidden", needed: permission }) };
  }

  return { ok: true, ctx, ip };
}

/**
 * الاشتراكات/الحجوزات اللي المستخدم مسموح له يشوفها:
 * — الكوتش: بتوعه هو بس (بنرجّع الـ id بتاعه للفلترة في الاستعلام)
 * — غير كده: null = من غير فلترة
 */
export const scopeCoachId = (ctx: AuthContext): string | null => (isScopedToOwn(ctx.user.role) ? ctx.user.id : null);

export const actorOf = (ctx: AuthContext) => ({ id: ctx.user.id, email: ctx.user.email, role: ctx.user.role });
