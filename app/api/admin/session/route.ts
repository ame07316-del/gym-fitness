import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminEnabled, checkPassword, cookieOptions, createSessionToken, SESSION_HOURS, usingDevPassword } from "@/app/lib/server/admin-auth";
import { clientIp, isAdminRequest } from "@/app/lib/server/admin-guard";

export const dynamic = "force-dynamic";

/**
 * تحديد محاولات الدخول: 5 محاولات غلط لكل IP ثم قفل 10 دقايق.
 * (in-memory — كفاية للديمو؛ في الإنتاج استخدم Redis/Upstash أو حماية الـ edge)
 */
type Attempt = { count: number; lockedUntil: number };
const attempts = new Map<string, Attempt>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60_000;

function lockState(ip: string, now = Date.now()) {
  const a = attempts.get(ip);
  if (!a) return { locked: false, left: MAX_ATTEMPTS, retryAfter: 0 };
  if (a.lockedUntil > now) return { locked: true, left: 0, retryAfter: Math.ceil((a.lockedUntil - now) / 1000) };
  if (a.lockedUntil && a.lockedUntil <= now) attempts.delete(ip);
  return { locked: false, left: MAX_ATTEMPTS - (attempts.get(ip)?.count ?? 0), retryAfter: 0 };
}

/** حالة الجلسة الحالية — الواجهة بتناديها أول ما تفتح */
export async function GET(request: Request) {
  const authed = await isAdminRequest(request);
  return NextResponse.json({
    ok: true,
    authenticated: authed,
    enabled: adminEnabled(),
    devPassword: usingDevPassword() ? "admin123" : null,
    sessionHours: SESSION_HOURS,
  });
}

/** تسجيل الدخول: { password } → كوكي httpOnly موقّعة */
export async function POST(request: Request) {
  if (!adminEnabled()) {
    return NextResponse.json({ error: "لوحة الإدارة مقفولة — ظبّط ADMIN_PASSWORD في متغيرات البيئة", code: "disabled" }, { status: 503 });
  }

  const ip = clientIp(request);
  const state = lockState(ip);
  if (state.locked) {
    return NextResponse.json(
      { error: `محاولات كتير غلط — استنى ${Math.ceil(state.retryAfter / 60)} دقيقة وجرّب تاني`, code: "locked", retryAfter: state.retryAfter },
      { status: 429, headers: { "Retry-After": String(state.retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "اكتب كلمة المرور", fields: { password: "كلمة المرور مطلوبة" } }, { status: 422 });
  }

  if (!checkPassword(password)) {
    const prev = attempts.get(ip) ?? { count: 0, lockedUntil: 0 };
    const count = prev.count + 1;
    const lockedUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0;
    attempts.set(ip, { count, lockedUntil });
    const left = Math.max(0, MAX_ATTEMPTS - count);
    return NextResponse.json(
      {
        error: left > 0 ? `كلمة المرور غلط — فاضل ${left} ${left === 1 ? "محاولة" : "محاولات"}` : "اتقفل الدخول 10 دقايق بعد 5 محاولات غلط",
        code: "invalid_password",
        fields: { password: "كلمة المرور غير صحيحة" },
        attemptsLeft: left,
      },
      { status: 401 },
    );
  }

  attempts.delete(ip);
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true, authenticated: true, expiresIn: SESSION_HOURS * 3600 });
  res.cookies.set(ADMIN_COOKIE, token, cookieOptions(SESSION_HOURS * 3600));
  return res;
}

/** تسجيل الخروج: مسح الكوكي */
export async function DELETE() {
  const res = NextResponse.json({ ok: true, authenticated: false });
  res.cookies.set(ADMIN_COOKIE, "", cookieOptions(0));
  return res;
}
