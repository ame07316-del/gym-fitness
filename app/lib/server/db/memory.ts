/**
 * أدابتر الذاكرة — الوضع الافتراضي لما `DATABASE_URL` مش موجود.
 *
 * نفس المخزن القديم بالظبط (متعلّق على `globalThis` عشان يعيش عبر الـ HMR وبين
 * البندلات)، بس مغلّف في واجهة `Repo` async زي أدابتر Postgres.
 * كده `npm run dev` و `npm test` شغالين من غير أي إعداد.
 */
import { MAX_ROWS, type BookingRecord, type DbSnapshot, type PaymentIntent, type Repo, type SubscribeRecord } from "../db";

export type MemoryDb = {
  bookings: BookingRecord[];
  orders: SubscribeRecord[];
  intents: Map<string, PaymentIntent>;
  bootedAt: number;
};

const KEY = "__fitzone_memory_db__";
const g = globalThis as unknown as Record<string, MemoryDb | undefined>;

/** المخزن المشترك (نسخة واحدة لكل عملية) */
export const memoryDb: MemoryDb = (g[KEY] ??= {
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

/** الـ Map بتكبر مع كل محاولة دفع — بنشيل الأقدم لما تعدّي الحد */
function trimIntents(intents: Map<string, PaymentIntent>, max = MAX_ROWS) {
  if (intents.size <= max) return;
  const oldest = [...intents.values()].sort((a, b) => a.createdAt - b.createdAt).slice(0, intents.size - max);
  for (const i of oldest) intents.delete(i.reference);
}

export function createMemoryRepo(db: MemoryDb = memoryDb): Repo {
  const payments = () => [...db.intents.values()].sort((a, b) => b.createdAt - a.createdAt);

  return {
    kind: "memory",
    label: "الذاكرة (وضع التجربة)",
    sql: null,
    bootedAt: () => db.bootedAt,

    async listBookings(limit = MAX_ROWS) {
      return db.bookings.slice(0, limit);
    },
    async addBooking(record) {
      // نفس الـ idempotency بتاع Postgres: نفس الكود = تحديث الصف مش صف جديد
      const existing = db.bookings.findIndex((b) => b.id === record.id);
      if (existing >= 0) {
        db.bookings[existing] = { ...db.bookings[existing], ...record };
        return db.bookings[existing];
      }
      pushCapped(db.bookings, record);
      return record;
    },

    async countBookings() {
      return db.bookings.length;
    },

    async listOrders(limit = MAX_ROWS) {
      return db.orders.slice(0, limit);
    },
    async addOrder(record) {
      const existing = db.orders.findIndex((o) => o.orderId === record.orderId);
      if (existing >= 0) {
        db.orders[existing] = { ...db.orders[existing], ...record };
        return db.orders[existing];
      }
      pushCapped(db.orders, record);
      return record;
    },

    async listPayments(limit = MAX_ROWS) {
      return payments().slice(0, limit);
    },
    async getPayment(reference) {
      return db.intents.get(reference) ?? null;
    },
    async addPayment(intent) {
      db.intents.set(intent.reference, intent);
      trimIntents(db.intents);
      return intent;
    },
    async updatePayment(reference, patch) {
      const current = db.intents.get(reference);
      if (!current) return null;
      const next = { ...current, ...patch, updatedAt: patch.updatedAt ?? Date.now() };
      db.intents.set(reference, next);
      return next;
    },

    async snapshot(): Promise<DbSnapshot> {
      return { bookings: [...db.bookings], orders: [...db.orders], payments: payments(), bootedAt: db.bootedAt };
    },
    async reset() {
      db.bookings.length = 0;
      db.orders.length = 0;
      db.intents.clear();
    },
  };
}
