/**
 * تحديد معدّل الطلبات (Rate limiting) على قاعدة البيانات.
 *
 * بيحمي: تسجيل الدخول (تخمين كلمات السر)، إنشاء الحجوزات/الاشتراكات (سبام)،
 * وتأكيد الـ OTP. مخزّن في SQLite عشان يفضل شغّال بعد إعادة تشغيل السيرفر.
 *
 * في إنتاج بعدة نسخ (multi-instance) استبدل الملف ده بـ Redis — نفس التوقيع.
 */
import { getDb, now } from ".";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function hitRateLimit(
  key: string,
  opts: { limit: number; windowMs: number; blockMs?: number },
): RateLimitResult {
  const db = getDb();
  const ts = now();
  const blockMs = opts.blockMs ?? opts.windowMs;

  const row = db.prepare("SELECT count, window_start, blocked_until FROM rate_limits WHERE key = ?").get(key) as
    | { count: number; window_start: number; blocked_until: number }
    | undefined;

  if (row && row.blocked_until > ts) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((row.blocked_until - ts) / 1000) };
  }

  const freshWindow = !row || ts - row.window_start > opts.windowMs;
  const count = freshWindow ? 1 : row!.count + 1;
  const windowStart = freshWindow ? ts : row!.window_start;
  const blockedUntil = count > opts.limit ? ts + blockMs : 0;

  db.prepare(
    `INSERT INTO rate_limits (key, count, window_start, blocked_until)
     VALUES (@key, @count, @windowStart, @blockedUntil)
     ON CONFLICT(key) DO UPDATE SET count = @count, window_start = @windowStart, blocked_until = @blockedUntil`,
  ).run({ key, count, windowStart, blockedUntil });

  // تنضيف كسول للمفاتيح القديمة (مش محتاجين cron)
  if (Math.random() < 0.02) {
    db.prepare("DELETE FROM rate_limits WHERE blocked_until < @ts AND window_start < @old").run({ ts, old: ts - 86_400_000 });
  }

  if (count > opts.limit) return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil(blockMs / 1000) };
  return { ok: true, remaining: Math.max(0, opts.limit - count), retryAfterSeconds: 0 };
}

/** بيصفّر العداد بعد نجاح العملية (مثلاً بعد login صح) */
export function clearRateLimit(key: string) {
  getDb().prepare("DELETE FROM rate_limits WHERE key = ?").run(key);
}
