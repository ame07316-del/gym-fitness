import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { computeOverview, sqlOverview, buildOverview } from "@/app/lib/server/admin-stats";
import { setRepo, type BookingRecord, type PaymentIntent, type Repo, type SqlClient, type SubscribeRecord } from "@/app/lib/server/db";
import { createMemoryRepo } from "@/app/lib/server/db/memory";
import { createPostgresRepo, pickDriver, postgresJsOptions } from "@/app/lib/server/db/postgres";
import { POST as book } from "@/app/api/bookings/route";
import { POST as subscribe } from "@/app/api/subscribe/route";
import { POST as pay } from "@/app/api/pay/route";
import { POST as confirm } from "@/app/api/pay/confirm/route";
import { GET as adminOrders } from "@/app/api/admin/orders/route";
import { GET as adminPayments } from "@/app/api/admin/payments/route";
import { ADMIN_COOKIE, createSessionToken } from "@/app/lib/server/admin-auth";

/**
 * أدابتر Postgres بيتختبر على **Postgres حقيقي** — PGlite (نفس محرك بوستجرس مترجم WASM)
 * بيشتغل جوه العملية من غير سيرفر ولا داتابيز خارجية، والمايجريشن اللي في `drizzle/`
 * هي اللي بتعمل الجداول. يعني الاختبار بيغطي: السكيما + المايجريشن + الأدابتر + الـ aggregates.
 */
const PAN = "4242424242424242";
const DAY = 86_400_000;
const NOW = new Date("2026-03-18T11:00:00.000Z").getTime();

let pglite: PGlite;
let client: SqlClient;
let repo: Repo;

const booking = (over: Partial<BookingRecord> = {}): BookingRecord => ({
  id: "BK-001",
  name: "أحمد سمير",
  phone: "01099998888",
  goal: "تنشيف وتقسيم",
  slot: "٤ – ٨ بالليل",
  plan: "برو",
  status: "confirmed",
  createdAt: NOW,
  ...over,
});

const order = (over: Partial<SubscribeRecord> = {}): SubscribeRecord => ({
  orderId: "FZ-2026-K3JD22",
  planId: "pro",
  planName: "برو",
  cycle: "quarterly",
  months: 3,
  addonIds: ["coach", "nutrition"],
  coupon: "FIT10",
  total: 2870,
  perMonth: 956,
  member: { name: "منى خالد", phone: "01099999999", goal: "لياقة عامة" },
  payment: "card",
  status: "active",
  autoRenew: true,
  createdAt: NOW,
  endsAt: NOW + 90 * DAY,
  ...over,
});

const intent = (over: Partial<PaymentIntent> = {}): PaymentIntent => ({
  reference: "pi_s1_test1",
  amount: 2870,
  status: "requires_action",
  method: "card",
  brand: "visa",
  last4: "4242",
  code: "requires_action",
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

beforeAll(async () => {
  pglite = new PGlite();
  const db = drizzle(pglite);
  await migrate(db, { migrationsFolder: "drizzle" });
  client = db as unknown as SqlClient;
  repo = createPostgresRepo(client, NOW);
}, 60_000);

afterAll(async () => {
  setRepo(null);
  await pglite?.close();
});

beforeEach(async () => {
  await repo.reset();
});

describe("مايجريشن drizzle-kit — الجداول والأعمدة زي عقد الباك إند", () => {
  it("3 جداول: bookings / subscriptions / payments", async () => {
    const res = await pglite.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    expect(res.rows.map((r) => r.table_name)).toEqual(expect.arrayContaining(["bookings", "payments", "subscriptions"]));
  });

  it("payments فيها last4 و brand بس — مفيش عمود لرقم كارت أو CVV", async () => {
    const res = await pglite.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'payments' order by ordinal_position",
    );
    const cols = res.rows.map((r) => r.column_name);
    expect(cols).toEqual(["id", "reference", "order_id", "amount", "method", "status", "brand", "last4", "gateway_ref", "error_code", "created_at", "updated_at"]);
    for (const forbidden of ["card_number", "pan", "cvv", "cvc", "exp", "holder"]) expect(cols).not.toContain(forbidden);
    // العمود مقاسه 4 خانات أصلًا — مستحيل يشيل رقم كامل
    const size = await pglite.query<{ character_maximum_length: number }>(
      "select character_maximum_length from information_schema.columns where table_name = 'payments' and column_name = 'last4'",
    );
    expect(size.rows[0].character_maximum_length).toBe(4);
  });
});

describe("أدابتر Postgres — الحجوزات", () => {
  it("الحفظ والقراءة بنفس شكل BookingRecord", async () => {
    const saved = await repo.addBooking(booking());
    expect(saved).toEqual(booking());
    expect(await repo.listBookings()).toEqual([booking()]);
    expect(await repo.countBookings()).toBe(1);
  });

  it("نفس الكود مرتين = صف واحد (idempotency على client_ref)", async () => {
    await repo.addBooking(booking());
    await repo.addBooking(booking({ goal: "تخسيس", slot: "٦ – ٩ الصبح" }));
    const rows = await repo.listBookings();
    expect(rows).toHaveLength(1);
    expect(rows[0].goal).toBe("تخسيس");
  });

  it("الأحدث الأول", async () => {
    await repo.addBooking(booking({ id: "BK-OLD", createdAt: NOW - 2 * DAY }));
    await repo.addBooking(booking({ id: "BK-NEW", createdAt: NOW }));
    expect((await repo.listBookings()).map((b) => b.id)).toEqual(["BK-NEW", "BK-OLD"]);
  });

  it("مدخل أطول من العمود بيتقص من غير ما يرمي 500", async () => {
    const saved = await repo.addBooking(booking({ id: "BK-LONG", name: "م".repeat(200), plan: "x".repeat(90) }));
    expect(saved.name).toHaveLength(60);
    expect(saved.plan).toHaveLength(40);
  });
});

describe("أدابتر Postgres — الاشتراكات", () => {
  it("jsonb للإضافات، numeric للفلوس، والقيم بترجع بنفس الأنواع", async () => {
    const saved = await repo.addOrder(order());
    expect(saved).toEqual(order());
    expect(typeof saved.total).toBe("number");
    expect(saved.addonIds).toEqual(["coach", "nutrition"]);

    const raw = await pglite.query<{ addon_ids: unknown; total: string }>("select addon_ids, total from subscriptions");
    expect(raw.rows[0].addon_ids).toEqual(["coach", "nutrition"]);
    expect(raw.rows[0].total).toBe("2870.00");
  });

  it("من غير كوبون → null، ونفس orderId مرتين = صف واحد", async () => {
    await repo.addOrder(order({ coupon: null }));
    await repo.addOrder(order({ total: 3000 }));
    const rows = await repo.listOrders();
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(3000);
  });
});

describe("أدابتر Postgres — الدفع (آخر 4 أرقام بس)", () => {
  it("addPayment ثم getPayment ثم updatePayment = رحلة 3-D Secure كاملة", async () => {
    await repo.addPayment(intent());
    expect(await repo.getPayment("pi_s1_test1")).toEqual(intent());

    const done = await repo.updatePayment("pi_s1_test1", { status: "succeeded", code: "succeeded", updatedAt: NOW + 5_000 });
    expect(done).toMatchObject({ status: "succeeded", code: "succeeded", amount: 2870, updatedAt: NOW + 5_000 });
    expect(await repo.updatePayment("pi_s1_مفبرك", { status: "succeeded" })).toBeNull();
    expect(await repo.getPayment("pi_s1_مفبرك")).toBeNull();
  });

  it("مفيش رقم كارت كامل في أي صف — الجدول كله متفحوص", async () => {
    await repo.addPayment(intent());
    await repo.addPayment(intent({ reference: "pi_s1_test2", brand: "mada", last4: "1234", method: "card" }));
    const raw = await pglite.query("select * from payments");
    const dump = JSON.stringify(raw.rows);
    expect(dump).not.toContain(PAN);
    expect(dump).not.toContain("4242 4242");
    for (const row of await repo.listPayments()) expect(row.last4).toMatch(/^\d{4}$/);
  });
});

describe("reset — بيمسح الجداول التلاتة", () => {
  it("بعد المسح كل القوائم فاضية", async () => {
    await repo.addBooking(booking());
    await repo.addOrder(order());
    await repo.addPayment(intent());
    await repo.reset();
    expect(await repo.listBookings()).toEqual([]);
    expect(await repo.listOrders()).toEqual([]);
    expect(await repo.listPayments()).toEqual([]);
  });
});

/* ------------------------------------------------------------------------- */

/** نفس البيانات بالظبط في الأدابترين — عشان نقارن الـ SQL aggregates بحساب الذاكرة */
async function seedBoth(target: Repo) {
  const bookings = [
    booking({ id: "BK-1", goal: "تخسيس وحرق دهون", slot: "٦ – ٩ الصبح", createdAt: NOW }),
    booking({ id: "BK-2", goal: "تخسيس وحرق دهون", slot: "٤ – ٨ بالليل", createdAt: NOW - DAY }),
    booking({ id: "BK-3", goal: "تنشيف وتقسيم", slot: "٤ – ٨ بالليل", status: "pending", createdAt: NOW - 3 * DAY }),
  ];
  const orders = [
    order({ orderId: "FZ-1", createdAt: NOW }),
    order({ orderId: "FZ-2", planId: "vip", planName: "VIP إليت", cycle: "yearly", months: 12, addonIds: [], coupon: null, total: 15000, perMonth: 1250, payment: "wallet", createdAt: NOW - 2 * DAY, endsAt: NOW + 365 * DAY }),
    order({ orderId: "FZ-3", planId: "basic", planName: "أساسي", cycle: "monthly", months: 1, addonIds: ["coach"], coupon: null, total: 700, perMonth: 700, payment: "cash", status: "expired", createdAt: NOW - 5 * DAY, endsAt: NOW - DAY }),
  ];
  const intents = [
    intent({ reference: "pi_1", status: "succeeded", code: "succeeded", createdAt: NOW }),
    intent({ reference: "pi_2", status: "failed", code: "card_declined", last4: "0002", amount: 500, createdAt: NOW - DAY }),
    intent({ reference: "pi_3", status: "succeeded", code: "succeeded", method: "wallet", brand: "wallet", last4: "", amount: 15000, createdAt: NOW - 2 * DAY }),
    intent({ reference: "pi_4", brand: "mastercard", last4: "4444", amount: 700, createdAt: NOW - 3 * DAY }),
  ];
  for (const b of bookings) await target.addBooking(b);
  for (const o of orders) await target.addOrder(o);
  for (const p of intents) await target.addPayment(p);
}

describe("buildOverview — SQL aggregates = نفس أرقام حساب الذاكرة", () => {
  it("كل حقل في AdminOverview متطابق بين Postgres والذاكرة", async () => {
    await seedBoth(repo);
    const memory = createMemoryRepo({ bookings: [], orders: [], intents: new Map(), bootedAt: NOW });
    await seedBoth(memory);

    const fromSql = await sqlOverview(client, NOW, NOW);
    const fromMemory = computeOverview(await memory.snapshot(), NOW);

    expect(fromSql).toEqual(fromMemory);

    // ومطابقة صريحة للأرقام (مش مجرد «الاتنين زي بعض»)
    expect(fromSql.revenue).toEqual({ total: 18570, today: 2870, week: 18570, avgOrder: 6190, vat: Math.round((18570 * 14) / 114) });
    expect(fromSql.orders).toMatchObject({ total: 3, today: 1, active: 2 });
    expect(fromSql.orders.byCycle).toEqual({ quarterly: 1, yearly: 1, monthly: 1 });
    expect(fromSql.orders.byPayment).toEqual({ card: 1, wallet: 1, cash: 1 });
    expect(fromSql.orders.addons.map((a) => [a.id, a.count])).toEqual([["coach", 2], ["nutrition", 1]]);
    expect(fromSql.orders.coupons).toEqual([{ code: "FIT10", count: 1 }]);
    expect(fromSql.orders.byPlan.find((p) => p.id === "pro")).toMatchObject({ count: 1, revenue: 2870 });
    expect(fromSql.orders.byPlan.find((p) => p.id === "vip")).toMatchObject({ count: 1, revenue: 15000 });

    expect(fromSql.bookings).toMatchObject({ total: 3, today: 1, pending: 1 });
    expect(fromSql.bookings.byGoal).toEqual([{ goal: "تخسيس وحرق دهون", count: 2 }, { goal: "تنشيف وتقسيم", count: 1 }]);
    expect(fromSql.bookings.bySlot[0]).toEqual({ slot: "٤ – ٨ بالليل", count: 2 });

    expect(fromSql.payments).toMatchObject({ total: 4, succeeded: 2, requiresAction: 1, failed: 1, volume: 17870 });
    expect(fromSql.payments.declineCodes).toEqual([{ code: "card_declined", count: 1 }]);
    expect(fromSql.payments.byBrand).toEqual({ visa: 2, mastercard: 1 });

    expect(fromSql.daily).toHaveLength(7);
    expect(fromSql.daily[6]).toMatchObject({ orders: 1, revenue: 2870, bookings: 1 });
    expect(fromSql.daily.reduce((s, d) => s + d.orders, 0)).toBe(3);
  });

  it("صف addon_ids مش array (استيراد قديم) مش بيوقّع اللوحة", async () => {
    // اتكشفت من سكربت الزرع: postgres.js عمل double-encode فبقت القيمة jsonb string
    // بدل array، و jsonb_array_elements_text رمى «cannot extract elements from a scalar»
    // وضرب /api/admin/overview كله 500. الاستعلام دلوقتي بيتخطى الصفوف دي.
    await repo.addOrder(order({ orderId: "FZ-BAD", addonIds: ["coach"] }));
    await pglite.exec(`update subscriptions set addon_ids = '"[\\"coach\\"]"'::jsonb where order_id = 'FZ-BAD'`);

    const out = await sqlOverview(client, NOW, NOW);
    expect(out.orders.total).toBe(1);
    expect(out.orders.addons).toEqual([]);
  });

  it("قاعدة فاضية مش بتكسر (كل الأرقام أصفار)", async () => {
    const empty = await sqlOverview(client, NOW, NOW);
    expect(empty.revenue).toEqual({ total: 0, today: 0, week: 0, avgOrder: 0, vat: 0 });
    expect(empty.orders.byPlan.every((p) => p.count === 0)).toBe(true);
    expect(empty.orders.coupons).toEqual([]);
    expect(empty.payments).toMatchObject({ total: 0, succeeded: 0, failed: 0, volume: 0 });
    expect(empty.daily.every((d) => d.revenue === 0 && d.orders === 0 && d.bookings === 0)).toBe(true);
  });
});

describe("اختيار الدرايفر من شكل الـ DATABASE_URL", () => {
  const NEON = "postgresql://user:pass@ep-cool-block-123-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
  const SUPA_POOLER = "postgresql://postgres.abcdefgh:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
  const SUPA_DIRECT = "postgresql://postgres:pass@db.abcdefgh.supabase.co:5432/postgres";

  it("Neon → HTTP driver، وSupabase/أي بوستجرس تاني → postgres.js", () => {
    expect(pickDriver(NEON, "")).toBe("neon-http");
    expect(pickDriver(SUPA_POOLER, "")).toBe("postgres-js");
    expect(pickDriver(SUPA_DIRECT, "")).toBe("postgres-js");
    expect(pickDriver("postgresql://postgres:pass@127.0.0.1:5432/postgres", "")).toBe("postgres-js");
    expect(pickDriver("postgresql://u:p@db.internal.example.com:5432/gym", "")).toBe("postgres-js");
  });

  it("DATABASE_DRIVER بيكسب على الاكتشاف التلقائي", () => {
    expect(pickDriver(SUPA_POOLER, "neon")).toBe("neon-http");
    expect(pickDriver(NEON, "postgres")).toBe("postgres-js");
  });

  it("إعدادات Supavisor: prepare=false و pool صغير و TLS للبعيد بس", () => {
    // الـ transaction pooler (6543) بيرمي «prepared statement already exists» من غير prepare:false
    expect(postgresJsOptions(SUPA_POOLER)).toMatchObject({ prepare: false, max: 1, ssl: "require" });
    expect(postgresJsOptions(SUPA_DIRECT).ssl).toBe("require");
    // محلي = من غير TLS، ولو الـ URL محدد sslmode يبقى هو الحاكم
    expect(postgresJsOptions("postgresql://postgres:pass@127.0.0.1:55432/postgres").ssl).toBeUndefined();
    expect(postgresJsOptions(`${SUPA_DIRECT}?sslmode=disable`).ssl).toBeUndefined();
  });
});

describe("الـ seam — نفس الـ Route Handlers شغالة فوق Postgres", () => {
  const post = (url: string, body: unknown) =>
    new Request(`http://local.test${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  const asAdmin = async (url: string) =>
    new Request(`http://local.test${url}`, { headers: { cookie: `${ADMIN_COOKIE}=${await createSessionToken()}` } });

  beforeAll(() => setRepo(repo));
  afterAll(() => setRepo(null));

  it("حجز → اشتراك → دفع → OTP → قوائم الأدمن، كلها على الداتابيز", async () => {
    const booked = await book(post("/api/bookings", { id: "BK-API", name: "منى خالد", phone: "01012345678", goal: "تخسيس", slot: "٦ م", plan: "برو" }));
    expect(booked.status).toBe(201);
    expect((await booked.json()).queue).toBe(1);

    const subscribed = await subscribe(post("/api/subscribe", { orderId: "FZ-API", planId: "pro", planName: "برو", cycle: "quarterly", months: 3, addonIds: ["coach"], coupon: "FIT10", total: 2870, perMonth: 956, payment: "card", member: { name: "منى خالد", phone: "01012345678", goal: "تخسيس" }, endsAt: Date.now() + 90 * DAY }));
    expect(subscribed.status).toBe(201);
    expect((await subscribed.json()).invoice).toBe("INV-FZ-API");

    const paid = await (await pay(post("/api/pay", { method: "card", amount: 2870, card: { number: "4242 4242 4242 4242" } }))).json();
    expect(paid.status).toBe("requires_action");
    const ok = await (await confirm(post("/api/pay/confirm", { reference: paid.reference, code: "483920" }))).json();
    expect(ok.status).toBe("succeeded");

    // الصف اتحدّث فعلًا في الجدول
    const row = await pglite.query<{ status: string; last4: string; error_code: string }>("select status, last4, error_code from payments where reference = $1", [paid.reference]);
    expect(row.rows[0]).toEqual({ status: "succeeded", last4: "4242", error_code: "succeeded" });
    expect(JSON.stringify(row.rows)).not.toContain(PAN);

    const orders = await (await adminOrders(await asAdmin("/api/admin/orders?q=منى"))).json();
    expect(orders.total).toBe(1);
    const payments = await (await adminPayments(await asAdmin("/api/admin/payments?status=succeeded"))).json();
    expect(payments.items[0].reference).toBe(paid.reference);

    const o = await buildOverview();
    expect(o.orders.total).toBe(1);
    expect(o.bookings.total).toBe(1);
    expect(o.payments.succeeded).toBe(1);
  });

  it("من غير DATABASE_URL بيرجع لأدابتر الذاكرة (صفر إعداد)", async () => {
    setRepo(null);
    const { getRepo } = await import("@/app/lib/server/db");
    const auto = await getRepo();
    expect(auto.kind).toBe("memory");
    expect(auto.sql).toBeNull();
    setRepo(repo);
  });
});
