/**
 * طبقة الدفع — حالياً وضع تجريبي (Sandbox) بسلوك بوابات دفع حقيقية:
 * — فحص Luhn لرقم الكارت + معرفة الشبكة (Visa / Mastercard / mada / Amex)
 * — أرقام اختبار بتدي نتائج مختلفة (نجاح / رفض / رصيد غير كافٍ)
 * — خطوة تحقق 3-D Secure (OTP) قبل ما الطلب يخلص
 * الربط الحقيقي لازم يتم من السيرفر ببيانات اعتماد سرية والتحقق من نجاح الدفع
 * قبل التفعيل. مجرد تغيير متغير بيئة في المتصفح لا يفعّل بوابة فعلية.
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

import { apiFetch, ENDPOINTS } from "./api";

// The built-in payment routes only simulate a bank. An env var alone never enables real charges.
export const PROVIDER = "sandbox";
export const IS_SANDBOX = true;

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
  if (/^(5080|5043|9201|5852|4292)/.test(n)) return "mada";
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
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

export const OTP_HINT = "في وضع التجربة: أي 6 أرقام تنفع، و000000 بيرمّي خطأ رمز غلط";

const paymentError = (message: string, reference = "", amount = 0): PayResult => ({
  ok: false, status: "failed", reference, provider: PROVIDER, message, amount,
});

function validPaymentResponse(data: PayResult | null): data is PayResult {
  return data !== null && typeof data.ok === "boolean" &&
    ["succeeded", "requires_action", "failed"].includes(data.status) &&
    typeof data.reference === "string" && data.reference.length > 0 &&
    typeof data.message === "string";
}

/** An HTTP/JSON failure must never turn into a simulated successful charge. */
export async function authorize(input: {
  method: PayMethod;
  amount: number;
  card?: CardFields;
  description?: string;
}): Promise<PayResult> {
  const res = await apiFetch<PayResult>(ENDPOINTS.pay, {
    method: "POST",
    body: { ...input, provider: PROVIDER },
  });
  // 200 = accepted; 402 = a real bank decline with a useful explanation.
  if ((res.ok || res.status === 402) && validPaymentResponse(res.data) && res.data.ok === res.ok &&
      typeof res.data.amount === "number" && Number.isFinite(res.data.amount)) {
    return { ...res.data, provider: res.data.provider ?? PROVIDER };
  }
  return paymentError(res.error ?? "رد غير صالح من سيرفر الدفع — حاول تاني", "", input.amount);
}

/** تأكيد 3-D Secure (الـ OTP). Invalid codes stay retryable, outages do not count as success. */
export async function confirmPayment(reference: string, code: string): Promise<PayResult> {
  const res = await apiFetch<PayResult>(ENDPOINTS.payConfirm, { method: "POST", body: { reference, code } });
  if ((res.ok || [401, 402, 404].includes(res.status)) && validPaymentResponse(res.data) && res.data.ok === res.ok &&
      (!res.ok || (typeof res.data.amount === "number" && Number.isFinite(res.data.amount)))) {
    return { ...res.data, reference, amount: res.data.amount ?? 0, provider: res.data.provider ?? PROVIDER };
  }
  return paymentError(res.error ?? "تعذّر تأكيد العملية مع البنك — حاول تاني", reference);
}
