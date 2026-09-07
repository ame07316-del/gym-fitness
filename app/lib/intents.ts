/**
 * مخزن نوايا الدفع (Payment intents) للوضع التجريبي.
 *
 * مقصود إنه في الذاكرة: النية عمرها دقايق وبتموت، والبوابة الحقيقية هي اللي
 * بتمسك الحالة دي في الإنتاج. المهم أمنيًا:
 *  — انتهاء صلاحية (10 دقايق) عشان مفيش نية تفضل مفتوحة للأبد.
 *  — عدد محاولات OTP محدود (5) — من غير كده الرمز 6 أرقام بيتكسر بالتخمين.
 *  — سقف لعدد النوايا المفتوحة (منع استهلاك الذاكرة).
 *  — **مفيش أي رقم كارت بيتخزن هنا** — الشعار وآخر 4 أرقام بس.
 */
export type IntentStatus = "requires_action" | "succeeded" | "failed";

export type Intent = {
  reference: string;
  amount: number;
  status: IntentStatus;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  brand: string;
  last4: string;
};

export const INTENT_TTL_MS = 10 * 60_000;
export const MAX_OTP_ATTEMPTS = 5;
const MAX_INTENTS = 500;

const store = new Map<string, Intent>();

function sweep(now: number) {
  for (const [key, intent] of store) if (intent.expiresAt < now) store.delete(key);
  // لو لسه أكتر من السقف بنشيل الأقدم
  while (store.size > MAX_INTENTS) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

export function putIntent(intent: Intent) {
  sweep(Date.now());
  store.set(intent.reference, intent);
}

export function getIntent(reference: string): Intent | null {
  const now = Date.now();
  sweep(now);
  const intent = store.get(reference);
  if (!intent) return null;
  if (intent.expiresAt < now) {
    store.delete(reference);
    return null;
  }
  return intent;
}

export function updateIntent(reference: string, patch: Partial<Intent>): Intent | null {
  const intent = getIntent(reference);
  if (!intent) return null;
  const next = { ...intent, ...patch };
  store.set(reference, next);
  return next;
}

export const openIntentsCount = () => {
  sweep(Date.now());
  return [...store.values()].filter((i) => i.status === "requires_action").length;
};

/** للاختبارات */
export const resetIntents = () => store.clear();
