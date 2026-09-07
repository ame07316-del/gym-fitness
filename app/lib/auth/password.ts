/**
 * تشفير كلمات السر — scrypt من `node:crypto` (مفيش أي dependency خارجية).
 *
 * القواعد اللي بنمشي عليها:
 *  — ملح عشوائي 16 بايت لكل مستخدم، والهاش 64 بايت.
 *  — المقارنة بـ `timingSafeEqual` عشان مانسرّبش معلومات من زمن الرد.
 *  — الصيغة المخزّنة فيها البارامترات، فلو زوّدناها بكرة الهاش القديم يفضل شغّال.
 *
 * الصيغة: `scrypt$N$r$p$saltB64$hashB64`
 */
import { randomBytes, scrypt as scryptCb, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const N = 16_384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

/** التطبيع: كلمة السر بتتقرأ كـ UTF-8 بعد توحيد الحروف (مهم للعربي والرموز) */
const norm = (password: string) => password.normalize("NFKC");

export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(norm(password), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(norm(password), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/** هاش وهمي بنقارن بيه لما اليوزر مش موجود — عشان زمن الرد يفضل ثابت (منع user enumeration) */
const DUMMY_HASH = hashPasswordSync("fitzone-dummy-password-do-not-use");

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const record = stored && stored.startsWith("scrypt$") ? stored : DUMMY_HASH;
  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = record.split("$");

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");

  let actual: Buffer;
  try {
    actual = await scrypt(norm(password), salt, expected.length, { N: n, r, p, maxmem: MAXMEM });
  } catch {
    return false;
  }

  const same = actual.length === expected.length && timingSafeEqual(actual, expected);
  // لو اتقارن بالهاش الوهمي بنرجّع false مهما حصل
  return stored && stored.startsWith("scrypt$") ? same : false;
}

/** سياسة كلمة السر — بترجع رسالة الخطأ بالعربي أو null لو الكلمة سليمة */
export function passwordProblem(password: string): string | null {
  const value = norm(password ?? "");
  if (value.length < 10) return "كلمة السر لازم تكون 10 حروف على الأقل";
  if (value.length > 200) return "كلمة السر طويلة أوي (الحد 200 حرف)";
  if (!/[A-Za-z\u0600-\u06FF]/.test(value)) return "لازم تحتوي على حرف واحد على الأقل";
  if (!/\d/.test(value)) return "لازم تحتوي على رقم واحد على الأقل";
  if (/^\s|\s$/.test(value)) return "شيل المسافات من أول أو آخر كلمة السر";
  const weak = ["password", "12345678", "qwerty", "fitzone", "admin123", "11111111"];
  if (weak.some((w) => value.toLowerCase().includes(w))) return "كلمة السر متوقّعة جدًا — اختار واحدة أصعب";
  return null;
}
