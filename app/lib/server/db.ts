/**
 * الـ seam بتاع التخزين — كل الـ Route Handlers ولوحة الإدارة بيتعاملوا مع الملف ده بس.
 *
 * فيه أدابتر واحد بواجهة واحدة (`Repo`) بس بتنفيذين:
 *
 *   1. **Postgres (Neon)** — لما `DATABASE_URL` موجود: Drizzle ORM فوق
 *      `@neondatabase/serverless` (HTTP driver — من غير TCP pool، مناسب للـ serverless).
 *   2. **Memory** — لما مش موجود: نفس مخزن الذاكرة القديم على `globalThis`،
 *      عشان `npm run dev` و `npm test` يفضلوا شغالين **من غير أي إعداد** (فلسفة المشروع).
 *
 * كل الدوال async في الحالتين، فتبديل التخزين مش بيغيّر سطر في الهاندلرز.
 */
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

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

/** أقصى عدد صفوف في مخزن الذاكرة — بعدها الأقدم بيتشال */
export const MAX_ROWS = 200;

/** أقصى عدد صفوف بتتسحب لقوائم لوحة الإدارة (البحث/الفلترة بيتمّوا فوقها) */
export const LIST_MAX = 1000;

/** عميل Drizzle خام — متاح في وضع Postgres بس، بتستخدمه aggregates لوحة الإدارة */
export type SqlClient = PgDatabase<PgQueryResultHKT>;

/** لقطة كاملة للبيانات — بيستخدمها `buildOverview` في وضع الذاكرة */
export type DbSnapshot = {
  bookings: BookingRecord[];
  orders: SubscribeRecord[];
  payments: PaymentIntent[];
  bootedAt: number;
};

/**
 * واجهة التخزين. نفس دوال المخزن القديم بالظبط بس async —
 * أي تنفيذ (ذاكرة / Postgres / باك إند تاني) لازم يرجّع نفس الأشكال.
 */
export type Repo = {
  readonly kind: "memory" | "postgres";
  /** عميل Drizzle (Postgres بس) — `null` في وضع الذاكرة */
  readonly sql: SqlClient | null;
  bootedAt(): number;

  listBookings(limit?: number): Promise<BookingRecord[]>;
  addBooking(record: BookingRecord): Promise<BookingRecord>;
  countBookings(): Promise<number>;

  listOrders(limit?: number): Promise<SubscribeRecord[]>;
  addOrder(record: SubscribeRecord): Promise<SubscribeRecord>;

  listPayments(limit?: number): Promise<PaymentIntent[]>;
  getPayment(reference: string): Promise<PaymentIntent | null>;
  addPayment(intent: PaymentIntent): Promise<PaymentIntent>;
  updatePayment(reference: string, patch: Partial<PaymentIntent>): Promise<PaymentIntent | null>;

  snapshot(): Promise<DbSnapshot>;
  /** تصفير كل الجداول — زر «مسح البيانات» في الأدمن + الاختبارات */
  reset(): Promise<void>;
};

/** رابط الداتابيز: `DATABASE_URL` (أو `POSTGRES_URL` اللي Neon/Vercel بيحطه) */
export function databaseUrl() {
  const url = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "").trim();
  return url;
}

/** هل إحنا شغالين على داتابيز حقيقية؟ (بيتعرض في `/api/admin/overview` والـ README) */
export const usingPostgres = () => databaseUrl().length > 0;

const KEY = "__fitzone_repo__";
const g = globalThis as unknown as Record<string, Promise<Repo> | undefined>;

async function createRepo(): Promise<Repo> {
  const url = databaseUrl();
  if (!url) {
    const { createMemoryRepo } = await import("./db/memory");
    return createMemoryRepo();
  }
  // استيراد كسول: من غير `DATABASE_URL` الدرايفر مش بيتحمّل أصلًا
  const { createNeonRepo } = await import("./db/postgres");
  return createNeonRepo(url);
}

/**
 * الـ repo المشترك. متعلّق على `globalThis` عشان يفضل نسخة واحدة مهما اتقسّم الكود
 * لبندلات (HMR في التطوير / chunk لكل route في الإنتاج).
 */
export function getRepo(): Promise<Repo> {
  return (g[KEY] ??= createRepo().catch((err: unknown) => {
    // متكاش فشل الاتصال — خلي الطلب الجاي يحاول من أول وجديد
    g[KEY] = undefined;
    throw err;
  }));
}

/** تصفير كل الجداول (زر «مسح البيانات» في الأدمن + الاختبارات) */
export async function resetDb() {
  const repo = await getRepo();
  await repo.reset();
}

/** لاختبارات الأدابتر: تبديل الـ repo المحقون + الرجوع للاكتشاف التلقائي بـ `null` */
export function setRepo(repo: Repo | null) {
  g[KEY] = repo ? Promise.resolve(repo) : undefined;
}
