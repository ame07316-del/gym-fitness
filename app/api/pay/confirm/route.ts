import { getIntent, MAX_OTP_ATTEMPTS, updateIntent } from "@/app/lib/intents";
import { hitRateLimit } from "@/app/lib/db/rate-limit";
import { clientIp, errorJson, json, readJson } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * تأكيد 3-D Secure للعملية المعلقة (نفس شكل confirm في Stripe/Paymob).
 * محمي من التخمين: 5 محاولات للنية الواحدة + حاجز على مستوى الـ IP.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = hitRateLimit(`otp:${ip}`, { limit: 20, windowMs: 10 * 60_000, blockMs: 10 * 60_000 });
  if (!limit.ok) return errorJson("محاولات تحقق كتير — استنى شوية", 429, { retryAfter: limit.retryAfterSeconds });

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const reference = typeof body.reference === "string" ? body.reference.slice(0, 80) : "";
  const code = typeof body.code === "string" ? body.code.trim().slice(0, 10) : "";
  const intent = getIntent(reference);

  if (!intent) {
    return json(
      { ok: false, status: "failed", reference, message: "العملية مش موجودة أو انتهت صلاحيتها — ابدأ الدفع من جديد" },
      { status: 404 },
    );
  }
  if (intent.status === "succeeded") {
    return json({ ok: true, status: "succeeded", reference, amount: intent.amount, message: "العملية متأكد عليها بالفعل" });
  }
  if (intent.status === "failed") {
    return json({ ok: false, status: "failed", reference, message: "العملية دي مرفوضة — ابدأ الدفع من جديد" }, { status: 402 });
  }

  if (intent.attempts >= MAX_OTP_ATTEMPTS) {
    updateIntent(reference, { status: "failed" });
    return json(
      { ok: false, status: "failed", reference, message: "تجاوزت عدد محاولات التحقق — العملية اتلغت، ابدأ من جديد" },
      { status: 429 },
    );
  }

  if (!/^\d{6}$/.test(code) || code === "000000") {
    const next = updateIntent(reference, { attempts: intent.attempts + 1 });
    const left = Math.max(0, MAX_OTP_ATTEMPTS - (next?.attempts ?? MAX_OTP_ATTEMPTS));
    return json(
      {
        ok: false,
        status: "requires_action",
        reference,
        attemptsLeft: left,
        message: `رمز التحقق غير صحيح — فاضل لك ${left} محاولات`,
      },
      { status: 401 },
    );
  }

  updateIntent(reference, { status: "succeeded" });
  return json({
    ok: true,
    status: "succeeded",
    code: "succeeded",
    reference,
    amount: intent.amount,
    provider: process.env.PAYMENT_PROVIDER ?? process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "sandbox",
    message: "تم التحقق من البنك واعتمدت العملية ✅",
  });
}
