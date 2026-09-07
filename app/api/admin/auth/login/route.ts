import { audit } from "@/app/lib/db/audit";
import { clearRateLimit, hitRateLimit } from "@/app/lib/db/rate-limit";
import { findUserById, isLocked, LOCK_AFTER_ATTEMPTS, normalizeEmail, registerFailedLogin, registerSuccessfulLogin, toPublicUser } from "@/app/lib/db/users";
import { getDb } from "@/app/lib/db";
import { verifyPassword } from "@/app/lib/auth/password";
import { ROLE_PERMISSIONS } from "@/app/lib/auth/roles";
import { createSession, sessionCookies } from "@/app/lib/auth/session";
import { cleanText, clientIp, errorJson, json, readJson } from "@/app/lib/http";
import type { UserRow } from "@/app/lib/db/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** رسالة واحدة لكل حالات الفشل — عشان مانقولش لحد «الإيميل ده موجود» */
const GENERIC = "الإيميل أو كلمة السر غير صحيحة";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return errorJson("الطلب جاي من مصدر غير موثوق", 403, { code: "bad_origin" });

  const ip = clientIp(request);
  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const email = normalizeEmail(cleanText(body.email, 160));
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";

  // حاجز أول: عدد محاولات من نفس الـ IP، وحاجز تاني على الإيميل نفسه
  const perIp = hitRateLimit(`login:ip:${ip}`, { limit: 15, windowMs: 10 * 60_000, blockMs: 10 * 60_000 });
  const perEmail = email ? hitRateLimit(`login:email:${email}`, { limit: 8, windowMs: 10 * 60_000, blockMs: 10 * 60_000 }) : { ok: true, retryAfterSeconds: 0 };
  if (!perIp.ok || !perEmail.ok) {
    const retry = Math.max(perIp.retryAfterSeconds, perEmail.retryAfterSeconds);
    audit({ action: "auth.login_failed", entity: "user", entityId: email || null, meta: { reason: "rate_limited" }, ip });
    return errorJson("محاولات كتير أوي — استنى شوية وجرّب تاني", 429, { retryAfter: retry });
  }

  if (!email || !password) return errorJson(GENERIC, 401, { code: "invalid_credentials" });

  const user = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;

  // بنتحقق من كلمة السر حتى لو اليوزر مش موجود (زمن رد ثابت = مفيش user enumeration)
  const passwordOk = await verifyPassword(password, user?.password_hash);

  if (!user || !passwordOk) {
    if (user) registerFailedLogin(user.id);
    audit({ action: "auth.login_failed", entity: "user", entityId: email, meta: { reason: user ? "bad_password" : "unknown_email" }, ip });
    return errorJson(GENERIC, 401, { code: "invalid_credentials" });
  }

  const fresh = findUserById(user.id)!;
  if (isLocked(fresh)) {
    const minutes = Math.ceil((fresh.locked_until - Date.now()) / 60_000);
    audit({ action: "auth.login_failed", entity: "user", entityId: fresh.id, meta: { reason: "locked" }, ip });
    return errorJson(`الحساب متقفل مؤقتًا بعد ${LOCK_AFTER_ATTEMPTS} محاولات — جرّب بعد ${minutes} دقيقة`, 423, { code: "locked" });
  }
  if (fresh.active !== 1) {
    audit({ action: "auth.login_failed", entity: "user", entityId: fresh.id, meta: { reason: "inactive" }, ip });
    return errorJson("الحساب متوقف — كلّم المدير العام", 403, { code: "inactive" });
  }

  registerSuccessfulLogin(fresh.id);
  clearRateLimit(`login:email:${email}`);

  const session = createSession(fresh.id, { ip, userAgent: request.headers.get("user-agent") });
  audit({ actor: { id: fresh.id, email: fresh.email, role: fresh.role }, action: "auth.login", entity: "user", entityId: fresh.id, ip });

  const publicUser = toPublicUser(findUserById(fresh.id)!);
  return json(
    {
      ok: true,
      user: publicUser,
      permissions: ROLE_PERMISSIONS[publicUser.role],
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
      mustChangePassword: publicUser.mustChangePassword,
    },
    { cookies: sessionCookies(request, session) },
  );
}
