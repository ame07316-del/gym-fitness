import { INTENT_TTL_MS, openIntentsCount, putIntent, type Intent } from "@/app/lib/intents";
import { hitRateLimit } from "@/app/lib/db/rate-limit";
import { clientIp, errorJson, json, readJson } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * نقطة دفع تجريبية (Sandbox).
 * المنطق هنا مطابق لسلوك بوابات الدفع: Luhn، قائمة رفض، و 3-D Secure.
 * في الإنتاج: استبدل جسم POST باستدعاء Paymob / Fawry / Stripe،
 * وخزّن الـ intent id في الداتابيز. شكل الرد (PayResult) مايتغيرش.
 *
 * أمان: رقم الكارت بيتقرا في الميموري، بيتحسب عليه Luhn، وبيتنسي.
 * مفيش تسجيل في اللوج ومفيش تخزين — اللي بيتخزن الشعار وآخر 4 أرقام بس.
 */
const PROVIDER = process.env.PAYMENT_PROVIDER ?? process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "sandbox";

const digits = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "").slice(0, 19) : "");

function luhnValid(n: string) {
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function brandOf(n: string) {
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(5080|5043|9201|5852|4292)/.test(n)) return "mada";
  return "unknown";
}

const DECLINES: Record<string, string> = {
  "4000000000000002": "card_declined",
  "4000000000009995": "insufficient_funds",
  "4000000000009987": "expired_card",
  "4000000000006051": "incorrect_cvc",
};

const MAX_AMOUNT = 1_000_000;

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = hitRateLimit(`pay:${ip}`, { limit: 30, windowMs: 10 * 60_000, blockMs: 5 * 60_000 });
  if (!limit.ok) return errorJson("محاولات دفع كتير — استنى شوية", 429, { retryAfter: limit.retryAfterSeconds });

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const method = typeof body.method === "string" ? body.method.slice(0, 20) : "card";
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    return errorJson("قيمة غير صالحة", 422);
  }

  const reference = `pi_s1_${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const card = (body.card ?? {}) as Record<string, unknown>;
  const n = digits(card.number);
  const brand = brandOf(n);
  const last4 = n.slice(-4);

  const base: Intent = {
    reference,
    amount,
    status: "succeeded",
    createdAt: Date.now(),
    expiresAt: Date.now() + INTENT_TTL_MS,
    attempts: 0,
    brand,
    last4,
  };

  let intent: Intent = base;
  let message = "تم اعتماد العملية";
  let code = "succeeded";

  if (method !== "card") {
    message = method === "cash" ? "الحجز محجوز 48 ساعة للدفع في الفرع" : "بانتظار تأكيد تحويل المحفظة";
  } else if (DECLINES[n]) {
    intent = { ...base, status: "failed" };
    code = DECLINES[n];
    message =
      code === "card_declined"
        ? "البنك رفض الكارت (card_declined) — جرّب كارت تاني أو اختار محفظة"
        : code === "insufficient_funds"
          ? "الرصيد غير كافٍ في البطاقة"
          : code === "expired_card"
            ? "البطاقة منتهية الصلاحية"
            : "رمز الأمان (CVV) غير مطابق";
  } else if (!luhnValid(n)) {
    intent = { ...base, status: "failed" };
    code = "invalid_number";
    message = "رقم البطاقة غير صحيح — فشل فحص Luhn";
  } else {
    intent = { ...base, status: "requires_action" };
    code = "requires_action";
    message = "البنك طلب تحقق إضافي 3-D Secure — ادخل الرمز اللي وصلك";
  }

  putIntent(intent);

  return json(
    {
      ok: intent.status !== "failed",
      status: intent.status,
      code,
      provider: PROVIDER,
      reference,
      amount,
      brand,
      last4,
      message,
      expiresIn: Math.floor(INTENT_TTL_MS / 1000),
      otpHint: intent.status === "requires_action" ? "OTP: أي 6 أرقام (000000 = رمز غلط)" : undefined,
    },
    { status: intent.status === "failed" ? 402 : 200 },
  );
}

export async function GET() {
  return json({
    provider: PROVIDER,
    sandbox: true,
    openIntents: openIntentsCount(),
    note: "دي نقطة دفع تجريبية — مفيش فلوس بتتحرك.",
  });
}
