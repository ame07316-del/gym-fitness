/**
 * مخزن الذاكرة المشترك بين كل الـ Route Handlers (وضع التجربة — من غير داتابيز).
 *
 * متعلّق على `globalThis` عشان يفضل نسخة واحدة مهما اتقسّم الكود لبندلات
 * (HMR في التطوير / chunk لكل route في الإنتاج) — فلوحة الإدارة بتقرأ نفس الصفوف
 * اللي `/api/bookings` و `/api/subscribe` و `/api/pay` كتبوها.
 *
 * في الإنتاج: بدّل الملف ده بطبقة داتابيز (MySQL/Postgres عبر Prisma أو Drizzle)
 * — الواجهة والـ handlers مش محتاجين تعديل، لأن الكل بيتعامل مع `db.*` بس.
 */
export type BookingRecord = {
  id: string;
  name: string;
  phone: string;
  goal: string;
  slot: string;
  plan: string;
  status: string;
  createdAt: number;
};

export type SubscribeRecord = {
  orderId: string;
  planId: string;
  planName: string;
  cycle: string;
  months: number;
  addonIds: string[];
  coupon: string | null;
  total: number;
  perMonth: number;
  member: { name: string; phone: string; goal: string };
  payment: string;
  status: string;
  autoRenew: boolean;
  createdAt: number;
  endsAt: number;
};

export type PaymentStatus = "requires_action" | "succeeded" | "failed";

/** عملية دفع — بنخزّن آخر 4 أرقام ونوع الكارت بس (زي أي بوابة)، مفيش رقم كارت كامل أبدًا */
export type PaymentIntent = {
  reference: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  brand: string;
  last4: string;
  code: string;
  createdAt: number;
  updatedAt: number;
};

export type MemoryDb = {
  bookings: BookingRecord[];
  orders: SubscribeRecord[];
  intents: Map<string, PaymentIntent>;
  bootedAt: number;
};

/** أقصى عدد صفوف لكل جدول في الذاكرة — بعدها الأقدم بيتشال */
export const MAX_ROWS = 200;

const KEY = "__fitzone_memory_db__";
const g = globalThis as unknown as Record<string, MemoryDb | undefined>;

export const db: MemoryDb = (g[KEY] ??= {
  bookings: [],
  orders: [],
  intents: new Map(),
  bootedAt: Date.now(),
});

/** إدراج في أول القائمة مع الحفاظ على الحد الأقصى */
export function pushCapped<T>(list: T[], item: T, max = MAX_ROWS) {
  list.unshift(item);
  if (list.length > max) list.length = max;
}

/** تصفير كل الجداول (زر «مسح البيانات» في الأدمن + الاختبارات) */
export function resetDb() {
  db.bookings.length = 0;
  db.orders.length = 0;
  db.intents.clear();
}
