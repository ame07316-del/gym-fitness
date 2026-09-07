/**
 * الجلسات والكوكيز — جلسات على قاعدة البيانات (مش JWT).
 *
 * ليه؟ عشان الجلسة تتلغى فورًا لما المدير يعطّل مستخدم أو يغيّر دوره —
 * حاجة مستحيلة مع توكن موقّع بس من غير حالة على السيرفر.
 *
 * التفاصيل الأمنية:
 *  — التوكن 32 بايت عشوائية، و**اللي بيتخزن هو sha256 بتاعه** (تسريب الداتابيز ما يديش جلسات).
 *  — الكوكي: HttpOnly + SameSite=Strict + Secure (على https) + Path=/.
 *  — انتهاء بالخمول (60 دقيقة، بيتجدد مع الاستخدام) + سقف مطلق (12 ساعة).
 *  — CSRF: توكن تاني مربوط بنفس الجلسة (double submit) — الكوكي بتاعه مقروء للجافاسكريبت،
 *    والسيرفر بيقارن هاشه باللي مخزّن في صف الجلسة.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getDb, now } from "../db";
import { findUserById, toPublicUser, type PublicUser, type UserRow } from "../db/users";

export const SESSION_COOKIE = "fz_session";
export const CSRF_COOKIE = "fz_csrf";
export const CSRF_HEADER = "x-csrf-token";

const IDLE_MS = 60 * 60 * 1000; // ساعة خمول
const ABSOLUTE_MS = 12 * 60 * 60 * 1000; // سقف 12 ساعة

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const token = () => randomBytes(32).toString("base64url");

export type SessionInfo = {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  absoluteExpiresAt: number;
};

export type AuthContext = { user: PublicUser; row: UserRow; session: SessionInfo };

/* ============================== إنشاء / إنهاء ============================== */

export function createSession(userId: string, meta: { ip?: string | null; userAgent?: string | null } = {}) {
  const raw = token();
  const csrf = token();
  const ts = now();

  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, csrf_hash, created_at, last_seen_at, expires_at, absolute_expires_at, ip, user_agent)
       VALUES (@id, @userId, @csrf, @ts, @ts, @expires, @absolute, @ip, @ua)`,
    )
    .run({
      id: sha256(raw),
      userId,
      csrf: sha256(csrf),
      ts,
      expires: ts + IDLE_MS,
      absolute: ts + ABSOLUTE_MS,
      ip: meta.ip ?? null,
      ua: (meta.userAgent ?? "").slice(0, 200) || null,
    });

  // تنضيف الجلسات الميتة
  getDb().prepare("DELETE FROM sessions WHERE expires_at < @ts OR absolute_expires_at < @ts").run({ ts });

  return { token: raw, csrfToken: csrf, expiresAt: ts + IDLE_MS };
}

export function revokeSession(rawToken: string) {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sha256(rawToken));
}

export function revokeAllSessionsFor(userId: string) {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

/* ============================== قراءة الجلسة ============================== */

export function resolveSession(rawToken: string | null | undefined): AuthContext | null {
  if (!rawToken || rawToken.length < 20 || rawToken.length > 200) return null;

  const id = sha256(rawToken);
  const ts = now();
  const row = getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as
    | { id: string; user_id: string; csrf_hash: string; created_at: number; expires_at: number; absolute_expires_at: number }
    | undefined;

  if (!row) return null;
  if (row.expires_at < ts || row.absolute_expires_at < ts) {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }

  const user = findUserById(row.user_id);
  // الحساب اتقفل أو اتعطّل أو اتمسح → الجلسة تموت في الحال
  if (!user || user.active !== 1) {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }

  // تجديد الخمول (مرة كل دقيقة على الأكثر عشان مانكتبش على الديسك كل طلب)
  const nextExpiry = Math.min(ts + IDLE_MS, row.absolute_expires_at);
  if (nextExpiry - row.expires_at > 60_000) {
    getDb().prepare("UPDATE sessions SET expires_at = @exp, last_seen_at = @ts WHERE id = @id").run({ exp: nextExpiry, ts, id });
  }

  return {
    user: toPublicUser(user),
    row: user,
    session: {
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at,
      expiresAt: nextExpiry,
      absoluteExpiresAt: row.absolute_expires_at,
    },
  };
}

/** مقارنة توكن الـ CSRF (ثابتة زمنيًا) مع اللي متخزن في صف الجلسة */
export function csrfMatches(rawToken: string, csrfToken: string | null | undefined): boolean {
  if (!csrfToken) return false;
  const row = getDb().prepare("SELECT csrf_hash FROM sessions WHERE id = ?").get(sha256(rawToken)) as { csrf_hash: string } | undefined;
  if (!row) return false;
  const a = Buffer.from(row.csrf_hash);
  const b = Buffer.from(sha256(csrfToken));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function listSessionsFor(userId: string) {
  return getDb()
    .prepare("SELECT id, created_at AS createdAt, last_seen_at AS lastSeenAt, ip, user_agent AS userAgent FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC")
    .all(userId) as { id: string; createdAt: number; lastSeenAt: number; ip: string | null; userAgent: string | null }[];
}

/* ================================ الكوكيز ================================ */

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie") ?? "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

const isHttps = (request: Request) =>
  request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production";

function cookie(name: string, value: string, opts: { maxAge: number; httpOnly: boolean; secure: boolean }) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Strict",
    `Max-Age=${opts.maxAge}`,
  ];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

/** الكوكيز اللي بتتبعت بعد نجاح تسجيل الدخول */
export function sessionCookies(request: Request, session: { token: string; csrfToken: string }): string[] {
  const secure = isHttps(request);
  const maxAge = Math.floor(ABSOLUTE_MS / 1000);
  return [
    cookie(SESSION_COOKIE, session.token, { maxAge, httpOnly: true, secure }),
    // مقروء للجافاسكريبت عن قصد — ده نص الـ double-submit، والقيمة الحقيقية متخزنة كهاش
    cookie(CSRF_COOKIE, session.csrfToken, { maxAge, httpOnly: false, secure }),
  ];
}

export function clearedCookies(request: Request): string[] {
  const secure = isHttps(request);
  return [
    cookie(SESSION_COOKIE, "", { maxAge: 0, httpOnly: true, secure }),
    cookie(CSRF_COOKIE, "", { maxAge: 0, httpOnly: false, secure }),
  ];
}
