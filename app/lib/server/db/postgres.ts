/**
 * أدابتر Postgres — Drizzle ORM فوق `@neondatabase/serverless` (HTTP driver).
 *
 * ليه الـ HTTP driver؟ لأن كل Route Handler في Vercel بيشتغل في lambda قصيرة العمر،
 * فمفيش فايدة من TCP pool: كل استعلام بيتبعت كـ HTTPS request واحد (`fetch`)،
 * يعني صفر connection leaks وشغال على Edge برضه.
 *
 * الدالة `createPostgresRepo` بتاخد أي عميل Drizzle متوافق مع Postgres، عشان
 * الاختبارات تشغّل **نفس الكود** فوق PGlite (Postgres حقيقي بالـ WASM) من غير سيرفر.
 */
import { count, desc, eq } from "drizzle-orm";
import { LIST_MAX, MAX_ROWS, type BookingRecord, type DbSnapshot, type PaymentIntent, type PaymentStatus, type Repo, type SqlClient, type SubscribeRecord } from "../db";
import { bookings, payments, subscriptions } from "./schema";

type BookingRow = typeof bookings.$inferSelect;
type SubscriptionRow = typeof subscriptions.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;

/** قص النص على طول العمود — عشان مدخل طويل من باك إند خارجي ميرميش 500 */
const cut = (v: string | null | undefined, max: number) => (v == null ? null : v.slice(0, max) || null);
const cutReq = (v: string, max: number) => v.slice(0, max);
const money = (v: string | number | null) => (v == null ? 0 : Math.round(Number(v)));
const ms = (d: Date | null) => (d ? d.getTime() : 0);

const BOOKING_STATUSES = ["pending", "confirmed", "cancelled"] as const;
const SUB_STATUSES = ["active", "frozen", "cancelled", "expired"] as const;
const PAY_STATUSES = ["requires_action", "succeeded", "failed"] as const;

const bookingStatusOf = (v: string) => (BOOKING_STATUSES as readonly string[]).includes(v) ? (v as (typeof BOOKING_STATUSES)[number]) : "pending";
const subStatusOf = (v: string) => ((SUB_STATUSES as readonly string[]).includes(v) ? (v as (typeof SUB_STATUSES)[number]) : "active");
const payStatusOf = (v: string) => ((PAY_STATUSES as readonly string[]).includes(v) ? (v as PaymentStatus) : "requires_action");

/* ---------- صف ↔ سجل (نفس الأشكال اللي الواجهة والاختبارات بتقراها) ---------- */

export const toBooking = (r: BookingRow): BookingRecord => ({
  id: r.clientRef,
  name: r.name,
  phone: r.phone,
  goal: r.goal ?? "",
  slot: r.slot ?? "",
  plan: r.plan ?? "",
  status: r.status,
  createdAt: ms(r.createdAt),
});

export const toOrder = (r: SubscriptionRow): SubscribeRecord => ({
  orderId: r.orderId,
  planId: r.planId ?? "",
  planName: r.planName ?? "",
  cycle: r.cycle ?? "",
  months: r.months,
  addonIds: Array.isArray(r.addonIds) ? r.addonIds : [],
  coupon: r.coupon,
  total: money(r.total),
  perMonth: money(r.perMonth),
  member: { name: r.memberName, phone: r.memberPhone, goal: r.memberGoal ?? "" },
  payment: r.payment ?? "",
  status: r.status,
  autoRenew: r.autoRenew,
  createdAt: ms(r.createdAt),
  endsAt: ms(r.endsAt),
});

export const toPayment = (r: PaymentRow): PaymentIntent => ({
  reference: r.reference,
  amount: money(r.amount),
  status: r.status,
  method: r.method,
  brand: r.brand ?? "",
  last4: r.last4 ?? "",
  code: r.code ?? "",
  createdAt: ms(r.createdAt),
  updatedAt: ms(r.updatedAt),
});

/* --------------------------------- الأدابتر --------------------------------- */

export function createPostgresRepo(client: SqlClient, bootedAt = Date.now()): Repo {
  return {
    kind: "postgres",
    sql: client,
    bootedAt: () => bootedAt,

    async listBookings(limit = MAX_ROWS) {
      const rows = await client.select().from(bookings).orderBy(desc(bookings.createdAt), desc(bookings.id)).limit(limit);
      return rows.map(toBooking);
    },

    async addBooking(record) {
      const values = {
        clientRef: cutReq(record.id, 24),
        name: cutReq(record.name, 60),
        phone: cutReq(record.phone, 20),
        goal: cut(record.goal, 60),
        slot: cut(record.slot, 40),
        plan: cut(record.plan, 40),
        status: bookingStatusOf(record.status),
        createdAt: new Date(record.createdAt),
      };
      // نفس الطلب مرتين (ضعف شبكة) = صف واحد — الـ `client_ref` هو مفتاح الـ idempotency
      const [row] = await client.insert(bookings).values(values).onConflictDoUpdate({ target: bookings.clientRef, set: values }).returning();
      return toBooking(row);
    },

    async countBookings() {
      const [row] = await client.select({ count: count() }).from(bookings);
      return Number(row?.count ?? 0);
    },

    async listOrders(limit = MAX_ROWS) {
      const rows = await client.select().from(subscriptions).orderBy(desc(subscriptions.createdAt), desc(subscriptions.id)).limit(limit);
      return rows.map(toOrder);
    },

    async addOrder(record) {
      const values = {
        orderId: cutReq(record.orderId, 24),
        memberName: cutReq(record.member.name, 60),
        memberPhone: cutReq(record.member.phone, 20),
        memberGoal: cut(record.member.goal, 60),
        planId: cut(record.planId, 12),
        planName: cut(record.planName, 40),
        cycle: cut(record.cycle, 12),
        months: record.months,
        addonIds: record.addonIds,
        coupon: cut(record.coupon, 20),
        payment: cut(record.payment, 12),
        total: String(record.total),
        perMonth: String(record.perMonth),
        startsAt: new Date(record.createdAt),
        endsAt: record.endsAt ? new Date(record.endsAt) : null,
        status: subStatusOf(record.status),
        autoRenew: record.autoRenew,
        createdAt: new Date(record.createdAt),
      };
      const [row] = await client.insert(subscriptions).values(values).onConflictDoUpdate({ target: subscriptions.orderId, set: values }).returning();
      return toOrder(row);
    },

    async listPayments(limit = MAX_ROWS) {
      const rows = await client.select().from(payments).orderBy(desc(payments.createdAt), desc(payments.id)).limit(limit);
      return rows.map(toPayment);
    },

    async getPayment(reference) {
      const [row] = await client.select().from(payments).where(eq(payments.reference, reference)).limit(1);
      return row ? toPayment(row) : null;
    },

    async addPayment(intent) {
      // ⚠️ آخر 4 أرقام + النوع بس — رقم الكارت الكامل عمره ما بيوصل هنا
      const values = {
        reference: cutReq(intent.reference, 48),
        amount: String(intent.amount),
        method: cutReq(intent.method, 12),
        status: payStatusOf(intent.status),
        brand: cut(intent.brand, 16),
        last4: cut(intent.last4, 4),
        code: cut(intent.code, 32),
        createdAt: new Date(intent.createdAt),
        updatedAt: new Date(intent.updatedAt),
      };
      const [row] = await client.insert(payments).values(values).onConflictDoUpdate({ target: payments.reference, set: values }).returning();
      return toPayment(row);
    },

    async updatePayment(reference, patch) {
      const set: Partial<typeof payments.$inferInsert> = { updatedAt: new Date(patch.updatedAt ?? Date.now()) };
      if (patch.status) set.status = payStatusOf(patch.status);
      if (patch.code != null) set.code = cut(patch.code, 32);
      if (patch.brand != null) set.brand = cut(patch.brand, 16);
      if (patch.last4 != null) set.last4 = cut(patch.last4, 4);
      if (patch.amount != null) set.amount = String(patch.amount);
      if (patch.method != null) set.method = cutReq(patch.method, 12);

      const [row] = await client.update(payments).set(set).where(eq(payments.reference, reference)).returning();
      return row ? toPayment(row) : null;
    },

    async snapshot(): Promise<DbSnapshot> {
      const [b, o, p] = await Promise.all([this.listBookings(LIST_MAX), this.listOrders(LIST_MAX), this.listPayments(LIST_MAX)]);
      return { bookings: b, orders: o, payments: p, bootedAt };
    },

    async reset() {
      await client.delete(payments);
      await client.delete(subscriptions);
      await client.delete(bookings);
    },
  };
}

/** إنشاء الأدابتر من `DATABASE_URL` بتاع Neon (`postgresql://…@ep-xxx.neon.tech/db?sslmode=require`) */
export async function createNeonRepo(url: string): Promise<Repo> {
  const [{ neon }, { drizzle }] = await Promise.all([import("@neondatabase/serverless"), import("drizzle-orm/neon-http")]);
  const client = drizzle(neon(url), { casing: "snake_case" });
  return createPostgresRepo(client as unknown as SqlClient);
}
