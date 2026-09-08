import { NextResponse } from "next/server";
import { db, MAX_ROWS, type PaymentIntent } from "@/app/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * نقطة دفع تجريبية (Sandbox).
 * المنطق هنا مطابق لسلوك بوابات الدفع: Luhn، قائمة رفض، و 3-D Secure.
 * في الإنتاج: استبدل جسم POST باستدعاء Paymob / Fawry / Stripe Invoice،
 * وخزّن الـ intent id في الداتابيز. شكل الرد (PayResult) مايتغيرش.
 */
const PROVIDER = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "sandbox";

/** سجل العمليات — نفس الـ Map اللي بيقرأ منها `/api/pay/confirm` ولوحة الإدارة (في db.ts) */
const intents = db.intents;

const digits = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : "");

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

const pretty = (n: string) => n.slice(-4);

/** الـ Map بيكبر مع كل محاولة دفع — بنشيل الأقدم لما يعدّي الحد */
function trimIntents() {
  if (intents.size <= MAX_ROWS) return;
  const oldest = [...intents.values()].sort((a, b) => a.createdAt - b.createdAt).slice(0, intents.size - MAX_ROWS);
  for (const i of oldest) intents.delete(i.reference);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const method = typeof body.method === "string" ? body.method : "card";
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "قيمة غير صالحة" }, { status: 422 });
  }

  const reference = `pi_s1_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const card = (body.card ?? {}) as Record<string, unknown>;
  const n = digits(card.number);
  const now = Date.now();

  let status: PaymentIntent["status"] = "succeeded";
  let message = "تم اعتماد العملية";
  let code = "succeeded";

  if (method !== "card") {
    message = method === "cash" ? "الحجز محجوز 48 ساعة للدفع في الفرع" : "بانتظار تأكيد تحويل المحفظة";
  } else if (DECLINES[n]) {
    status = "failed";
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
    status = "failed";
    code = "invalid_number";
    message = "رقم البطاقة غير صحيح — فشل فحص Luhn";
  } else {
    status = "requires_action";
    code = "requires_action";
    message = "البنك طلب تحقق إضافي 3-D Secure — ادخل الرمز اللي وصلك";
  }

  // بنخزّن آخر 4 أرقام والنوع بس — رقم الكارت الكامل مبيتحفظش في أي مكان
  const intent: PaymentIntent = {
    reference,
    amount,
    status,
    method,
    brand: method === "card" ? brandOf(n) : method,
    last4: method === "card" ? pretty(n) : "",
    code,
    createdAt: now,
    updatedAt: now,
  };
  intents.set(reference, intent);
  trimIntents();

  return NextResponse.json(
    {
      ok: status !== "failed",
      status,
      code,
      provider: PROVIDER,
      reference,
      amount,
      brand: brandOf(n),
      last4: pretty(n),
      message,
      otpHint: status === "requires_action" ? "OTP: أي 6 أرقام (000000 = رمز غلط)" : undefined,
    },
    { status: status === "failed" ? 402 : 200 },
  );
}

export async function GET() {
  return NextResponse.json({
    provider: PROVIDER,
    sandbox: true,
    openIntents: [...intents.values()].filter((i) => i.status === "requires_action").length,
    note: "دي نقطة دفع تجريبية — مفيش فلوس بتتحرك.",
  });
}
