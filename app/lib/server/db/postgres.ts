/**
 * أدابتر Postgres — Drizzle ORM، ونفس الكود بيشتغل على أي بوستجرس:
 *
 *   • **Neon**     → `@neondatabase/serverless` (SQL over HTTP): كل استعلام HTTPS request
 *                     واحد، صفر connection leaks في الـ serverless، وشغال على Edge.
 *   • **Supabase** → `postgres` (postgres.js) على الـ pooler بتاعهم (Supavisor) —
 *                     وأي بوستجرس تاني (RDS / VPS / دوكر محلي) بيمشي بنفس الدرايفر.
 *
 * الاختيار بيتم في `pickDriver()` من الـ host، والباقي (الاستعلامات، الـ upserts،
 * الـ aggregates) مشترك 100% بين الاتنين.
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

export function createPostgresRepo(client: SqlClient, bootedAt = Date.now(), label = "Postgres"): Repo {
  return {
    kind: "postgres",
    label,
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

/* ------------------------------- اختيار الدرايفر ------------------------------- */

/**
 * أي Postgres ينفع — بس الوصلة نفسها بتختلف:
 *
 *   • `neon-http`   → Neon: كل استعلام HTTPS request واحد (مفيش TCP ولا pool).
 *   • `postgres-js` → Supabase / RDS / VPS / أي بوستجرس عادي عبر TCP + TLS.
 *
 * الاختيار أوتوماتيك من الـ host، وتقدر تجبره بـ `DATABASE_DRIVER=neon|postgres`.
 */
export type DriverKind = "neon-http" | "postgres-js";

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
};

const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";

export function pickDriver(url: string, override = process.env.DATABASE_DRIVER): DriverKind {
  const forced = (override ?? "").trim().toLowerCase();
  if (forced.startsWith("neon")) return "neon-http";
  if (forced) return "postgres-js";

  const host = hostOf(url);
  // Neon بس هو اللي عنده الـ SQL-over-HTTP endpoint؛ أي حاجة تانية (Supabase وغيرها) TCP
  return host.endsWith(".neon.tech") || host.endsWith(".neon.build") ? "neon-http" : "postgres-js";
}

/** اسم المزوّد من الـ host — بيتعرض في لوحة الإدارة عشان تتأكد إنك موصول بالصح */
export function describeConnection(url: string, driver: DriverKind = pickDriver(url)) {
  const host = hostOf(url);
  const provider = host.endsWith(".neon.tech") || host.endsWith(".neon.build")
    ? "Neon"
    : host.includes("supabase")
      ? "Supabase"
      : isLocalHost(host)
        ? "Postgres محلي"
        : "Postgres";
  return `${provider} · ${driver === "neon-http" ? "HTTP driver" : "postgres.js"}`;
}

/** إنشاء الأدابتر من `DATABASE_URL` — بيختار الدرايفر المناسب لوحده */
export async function createSqlRepo(url: string, driver: DriverKind = pickDriver(url)): Promise<Repo> {
  const label = describeConnection(url, driver);

  if (driver === "neon-http") {
    const [{ neon }, { drizzle }] = await Promise.all([import("@neondatabase/serverless"), import("drizzle-orm/neon-http")]);
    return createPostgresRepo(drizzle(neon(url)) as unknown as SqlClient, Date.now(), label);
  }

  const [{ default: postgres }, { drizzle }] = await Promise.all([import("postgres"), import("drizzle-orm/postgres-js")]);
  const client = postgres(url, postgresJsOptions(url));
  return createPostgresRepo(drizzle(client) as unknown as SqlClient, Date.now(), label);
}

/**
 * إعدادات postgres.js اللي بتخلي Supabase (Supavisor) شغال من غير مفاجآت:
 *
 *   prepare: false  ← إجباري مع الـ **Transaction pooler** (بورت 6543): كل استعلام ممكن
 *                     يقع على كونكشن مختلف، فالـ prepared statements بتضرب `prepared
 *                     statement "s1" already exists`. مش بيضر في session/direct.
 *   max: 1          ← كل lambda عمرها ثواني؛ pool كبير = كونكشنز ميتة على السيرفر.
 *   ssl: "require"  ← أي host بعيد لازم TLS (لو الـ URL فيه sslmode بنسيبه هو الحاكم).
 */
export function postgresJsOptions(url: string): { prepare: boolean; max: number; idle_timeout: number; connect_timeout: number; ssl?: "require" } {
  const host = hostOf(url);
  const hasSslMode = /[?&]sslmode=/i.test(url);
  return {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    ...(hasSslMode || isLocalHost(host) ? {} : { ssl: "require" as const }),
  };
}
