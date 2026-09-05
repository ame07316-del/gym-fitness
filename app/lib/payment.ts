/**
 * طبقة الدفع — حالياً وضع تجريبي (Sandbox) بسلوك بوابات دفع حقيقية:
 * — فحص Luhn لرقم الكارت + معرفة الشبكة (Visa / Mastercard / mada / Amex)
 * — أرقام اختبار بتدي نتائج مختلفة (نجاح / رفض / رصيد غير كافٍ)
 * — خطوة تحقق 3-D Secure (OTP) قبل ما الطلب يخلص
 * للتحويل لبوابة حقيقية: حط NEXT_PUBLIC_PAYMENT_PROVIDER=haystack|paymob|stripe
 * وبدّل جسم authorize() بنداء الـ API بتاعهم — باقي الكود في مكانه.
 */
export type CardBrand = "visa" | "mastercard" | "amex" | "mada" | "unknown";

export type PayMethod = "card" | "wallet" | "install" | "cash";

export type PayResult = {
  ok: boolean;
  status: "succeeded" | "requires_action" | "failed";
  reference: string;
  provider: string;
  message: string;
  amount: number;
};

import { apiFetch, ENDPOINTS, HAS_EXTERNAL_BACKEND } from "./api";

export const PROVIDER = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "sandbox";
export const IS_SANDBOX = PROVIDER === "sandbox" || !process.env.NEXT_PUBLIC_PAYMENT_SECRET;

const digits = (v: string) => v.replace(/\D/g, "");

/** فحص Luhn الصحيح المستعمل في كل بوابات الدفع */
export function luhnValid(value: string): boolean {
  const n = digits(value);
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectBrand(value: string): CardBrand {
  const n = digits(value);
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(5080|5043|9201|5852|4292)/.test(n)) return "mada";
  return "unknown";
}

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "VISA",
  mastercard: "Mastercard",
  amex: "Amex",
  mada: "mada",
  unknown: "CARD",
};

/** تواريخ الانتهاء لازم تكون في المستقبل وبصيغة MM/YY */
export function expValid(value: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const end = new Date(year, month, 0, 23, 59, 59);
  return end.getTime() > now.getTime();
}

export type CardFields = { number: string; exp: string; cvv: string; holder: string };

export function validateCard(card: CardFields) {
  const errors: Partial<Record<keyof CardFields, string>> = {};
  const n = digits(card.number);
  const brand = detectBrand(card.number);
  const needLen = brand === "amex" ? 15 : 16;

  if (n.length !== needLen) errors.number = `رقم ${BRAND_LABEL[brand]} لازم يكون ${needLen} رقم`;
  else if (!luhnValid(n)) errors.number = "رقم البطاقة غير صحيح (فحص Luhn فشل)";
  if (!expValid(card.exp)) errors.exp = "تاريخ الانتهاء منتهي أو بصيغة غلط";
  if (!/^\d{3,4}$/.test(card.cvv)) errors.cvv = "CVV من 3 أو 4 أرقام";
  if (card.holder.trim().length < 4) errors.holder = "اكتب اسم حامل البطاقة كما هو مطبوع";

  return { brand, valid: Object.keys(errors).length === 0, errors, masked: n.slice(-4) };
}

/** أرقام الاختبار — بنفس منطق Stripe عشان تبقى مألوفة لأي حد شغال على دفع */
export const TEST_CARDS = [
  { number: "4242 4242 4242 4242", result: "نجاح + طلب 3-D Secure", tone: "ok" as const },
  { number: "4000 0000 0000 0002", result: "رفض من البنك (card_declined)", tone: "bad" as const },
  { number: "4000 0000 0000 9995", result: "رصيد غير كافٍ", tone: "bad" as const },
  { number: "5555 5555 5555 4444", result: "Mastercard — نجاح", tone: "ok" as const },
];

const DECLINE: Record<string, { message: string }> = {
  "4000000000000002": { message: "البنك رفض الكارت (card_declined) — جرّب كارت تاني" },
  "4000000000009995": { message: "الرصيد غير كافٍ (insufficient_funds)" },
  "4000000000009987": { message: "البطاقة محتاجة تحديث (expired_card)" },
};

export const OTP_HINT = "في وضع التجربة: أي 6 أرقام تنفع، و000000 بيرمّي خطأ رمز غلط";

function ref(prefix = "pi") {
  return `${prefix}_s1_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36).slice(-4)}`;
}

/**
 * authorize: بيتكلم على /api/pay الأول، ولو السيرفر مش متاح (أوفلاين/ريستارت)
 * بينفّذ نفس المنطق محلياً عشان الديمو يفضل شغال.
 */
export async function authorize(input: {
  method: PayMethod;
  amount: number;
  card?: CardFields;
  description?: string;
}): Promise<PayResult> {
  const local = simulate(input);
  const res = await apiFetch<PayResult>(ENDPOINTS.pay, {
    method: "POST",
    body: { ...input, provider: PROVIDER },
  });
  // 200 = مقبول · 402 = البنك رفض — الاتنين قرار البنك في الرسالة
  if (res.ok || res.status === 402) return { ...(res.data as PayResult), provider: res.data?.provider ?? PROVIDER };
  if (HAS_EXTERNAL_BACKEND) return { ...local, message: res.error ?? local.message };
  return local;
}

/** تأكيد 3-D Secure (الـ OTP) */
export async function confirmPayment(reference: string, code: string): Promise<PayResult> {
  const res = await apiFetch<PayResult>(ENDPOINTS.payConfirm, { method: "POST", body: { reference, code } });
  if (res.ok || res.status === 401 || res.status === 404) {
    if (res.data) return res.data;
    return { ok: res.ok, status: res.ok ? "succeeded" : "failed", reference, provider: PROVIDER, message: res.error ?? "تم", amount: 0 };
  }
  const ok = /^\d{6}$/.test(code) && code !== "000000";
  return {
    ok,
    status: ok ? "succeeded" : "failed",
    reference,
    provider: PROVIDER,
    message: ok ? "تم التحقق من البنك بنجاح" : "رمز التحقق غير صحيح — راجع الرسالة المصرفية",
    amount: 0,
  };
}

function simulate({ method, amount, card }: { method: PayMethod; amount: number; card?: CardFields }): PayResult {
  const reference = ref();
  if (method !== "card") {
    return { ok: true, status: "succeeded", reference, provider: PROVIDER, message: "تم تأكيد الطلب — الدفع عند الاستلام/المحفظة", amount };
  }
  const n = digits(card?.number ?? "");
  const decline = DECLINE[n];
  if (decline) return { ok: false, status: "failed", reference, provider: PROVIDER, message: decline.message, amount };
  if (!luhnValid(n)) return { ok: false, status: "failed", reference, provider: PROVIDER, message: "رقم البطاقة مافيش ليه وجود في السجل (Luhn فشل)", amount };
  return {
    ok: true,
    status: "requires_action",
    reference,
    provider: PROVIDER,
    message: "البنك طلب تحقق إضافي (3-D Secure) — ادخل الرمز",
    amount,
  };
}
