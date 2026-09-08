/**
 * سكيما Postgres (Drizzle ORM) — الأعمدة مأخوذة من قسم SQL في `docs/BACKEND-CONTRACT.md`
 * ومترجمة من MySQL لـ Postgres (enum types، `bigserial`، `jsonb`، `timestamptz`).
 *
 * ⚠️ الأمان: جدول `payments` بيخزّن **آخر 4 أرقام + نوع الشبكة بس** (`last4` / `brand`).
 * مفيش رقم كارت كامل ولا CVV ولا تاريخ صلاحية في أي عمود — نفس اللي بتعمله أي بوابة حقيقية.
 *
 * تعديل الملف ده = مايجريشن جديد:
 *   npm run db:generate   # بيكتب SQL في drizzle/
 *   npm run db:migrate    # بينفّذها على DATABASE_URL
 */
import { sql } from "drizzle-orm";
import { bigserial, boolean, index, jsonb, numeric, pgEnum, pgTable, smallint, timestamp, varchar } from "drizzle-orm/pg-core";

export const bookingStatus = pgEnum("booking_status", ["pending", "confirmed", "cancelled"]);
export const subscriptionStatus = pgEnum("subscription_status", ["active", "frozen", "cancelled", "expired"]);
export const paymentStatus = pgEnum("payment_status", ["requires_action", "succeeded", "failed"]);

/** الحجوزات / طلبات الجلسة التجريبية — `client_ref` هو الكود اللي الواجهة بتولّده (idempotency key) */
export const bookings = pgTable(
  "bookings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    clientRef: varchar("client_ref", { length: 24 }).notNull().unique(),
    name: varchar("name", { length: 60 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    goal: varchar("goal", { length: 60 }),
    slot: varchar("slot", { length: 40 }),
    plan: varchar("plan", { length: 40 }),
    status: bookingStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookings_created_at_idx").on(t.createdAt.desc()), index("bookings_status_idx").on(t.status)],
);

/** الاشتراكات — `order_id` هو رقم الطلب اللي الواجهة بتبعته (نفس الطلب مرتين = صف واحد) */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: varchar("order_id", { length: 24 }).notNull().unique(),
    memberName: varchar("member_name", { length: 60 }).notNull(),
    memberPhone: varchar("member_phone", { length: 20 }).notNull(),
    memberGoal: varchar("member_goal", { length: 60 }),
    planId: varchar("plan_id", { length: 12 }),
    planName: varchar("plan_name", { length: 40 }),
    cycle: varchar("cycle", { length: 12 }),
    months: smallint("months").notNull().default(1),
    addonIds: jsonb("addon_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    coupon: varchar("coupon", { length: 20 }),
    payment: varchar("payment", { length: 12 }),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    perMonth: numeric("per_month", { precision: 10, scale: 2 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: subscriptionStatus("status").notNull().default("active"),
    autoRenew: boolean("auto_renew").notNull().default(true),
    frozenDaysUsed: smallint("frozen_days_used").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_created_at_idx").on(t.createdAt.desc()), index("subscriptions_status_idx").on(t.status)],
);

/**
 * عمليات الدفع. `reference` = مرجع البوابة (`pi_s1_…`) وهو مفتاح الـ idempotency
 * لخطوة الـ OTP. `error_code` بيشيل كود الحالة/الرفض اللي الواجهة بتقراه في `code`.
 */
export const payments = pgTable(
  "payments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    reference: varchar("reference", { length: 48 }).notNull().unique(),
    orderId: varchar("order_id", { length: 24 }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    method: varchar("method", { length: 12 }).notNull(),
    status: paymentStatus("status").notNull().default("requires_action"),
    /** نوع الشبكة (visa / mastercard / mada …) — مش رقم كارت */
    brand: varchar("brand", { length: 16 }),
    /** آخر 4 أرقام بس — أقصى حاجة مسموح نخزّنها */
    last4: varchar("last4", { length: 4 }),
    /** معرّف العملية عند البوابة الحقيقية (Paymob/Fawry/Stripe) */
    gatewayRef: varchar("gateway_ref", { length: 64 }),
    code: varchar("error_code", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_created_at_idx").on(t.createdAt.desc()), index("payments_status_idx").on(t.status)],
);

export const schema = { bookings, subscriptions, payments, bookingStatus, subscriptionStatus, paymentStatus };
