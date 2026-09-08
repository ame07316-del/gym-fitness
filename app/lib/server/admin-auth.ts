/**
 * جلسة الأدمن — باسورد واحد من البيئة + كوكي موقّعة (HMAC-SHA256).
 *
 *   ADMIN_PASSWORD=...   ← الباسورد (لو فاضي في الإنتاج، اللوحة بتتقفل خالص)
 *   ADMIN_SECRET=...     ← اختياري: مفتاح توقيع الكوكي (الافتراضي مشتق من الباسورد)
 *
 * الكوكي نفسها مش بتشيل الباسورد — بتشيل `exp.signature` بس، فحتى لو حد قرأها
 * مش هيعرف الباسورد، ومش هيقدر يفبرك واحدة من غير السر.
 *
 * مكتوبة بـ Web Crypto بس (من غير `node:crypto`) عشان تشتغل في `proxy.ts` والـ route handlers على حد سواء.
 */
export const ADMIN_COOKIE = "fz_admin";
export const SESSION_HOURS = 12;

/** باسورد الديمو المحلي — بيشتغل في التطوير بس لما ADMIN_PASSWORD مش متظبط */
const DEV_FALLBACK_PASSWORD = "admin123";

export function adminPassword(): string | null {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === "production" ? null : DEV_FALLBACK_PASSWORD;
}

/** اللوحة مفعّلة؟ (في الإنتاج لازم ADMIN_PASSWORD) */
export const adminEnabled = () => adminPassword() !== null;

/** الباسورد المستخدم هو الافتراضي بتاع التطوير؟ (عشان نعرض تلميح في شاشة الدخول) */
export const usingDevPassword = () => !process.env.ADMIN_PASSWORD?.trim() && adminPassword() === DEV_FALLBACK_PASSWORD;

const enc = new TextEncoder();

function secretBytes() {
  const secret = process.env.ADMIN_SECRET?.trim() || `fitzone::${adminPassword() ?? "disabled"}`;
  return enc.encode(secret);
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", secretBytes(), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** مقارنة بوقت ثابت — عشان ما نسرّبش طول التطابق من زمن الرد */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** يولّد قيمة الكوكي: `<انتهاء بالمللي>.<توقيع>` */
export async function createSessionToken(now = Date.now()) {
  const exp = String(now + SESSION_HOURS * 3_600_000);
  return `${exp}.${await hmac(exp)}`;
}

/** يتحقق من الكوكي: التوقيع صحيح ولسه ما انتهتش */
export async function verifySessionToken(token: string | undefined | null, now = Date.now()) {
  if (!token || !adminEnabled()) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d{10,16}$/.test(exp) || Number(exp) < now) return false;
  return safeEqual(sig, await hmac(exp));
}

export function checkPassword(candidate: string) {
  const pw = adminPassword();
  return pw !== null && safeEqual(candidate, pw);
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});
