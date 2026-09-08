import { beforeEach, describe, expect, it } from "vitest";
import { ADMIN_COOKIE, checkPassword, createSessionToken, safeEqual, verifySessionToken } from "@/app/lib/server/admin-auth";
import { db, resetDb } from "@/app/lib/server/db";
import { buildOverview } from "@/app/lib/server/admin-stats";
import { matches, paginate, parseListQuery, toCsv } from "@/app/lib/server/admin-list";
import { DELETE as logout, GET as sessionInfo, POST as login } from "@/app/api/admin/session/route";
import { GET as overview } from "@/app/api/admin/overview/route";
import { GET as adminOrders } from "@/app/api/admin/orders/route";
import { GET as adminBookings } from "@/app/api/admin/bookings/route";
import { GET as adminPayments } from "@/app/api/admin/payments/route";
import { POST as reset } from "@/app/api/admin/reset/route";
import { POST as book } from "@/app/api/bookings/route";
import { POST as subscribe } from "@/app/api/subscribe/route";
import { POST as pay } from "@/app/api/pay/route";
import { POST as confirm } from "@/app/api/pay/confirm/route";

/**
 * لوحة الإدارة: التوقيع، الحارس، التجميع، القوائم، وتصدير CSV —
 * كلها بتنادي الـ route handlers مباشرة بنفس أسلوب tests/api-contract.test.ts.
 * في بيئة الاختبار NODE_ENV=test → باسورد التطوير الافتراضي `admin123` شغال.
 */
const json = (url: string, body?: unknown, init: RequestInit = {}) =>
  new Request(`http://local.test${url}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(init.headers as Record<string, string>) },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });

async function adminCookie() {
  const token = await createSessionToken();
  return { cookie: `${ADMIN_COOKIE}=${token}` };
}

const asAdmin = async (url: string) => new Request(`http://local.test${url}`, { headers: await adminCookie() });

async function seed() {
  resetDb();
  await book(json("/api/bookings", { name: "أحمد سمير", phone: "01099998888", goal: "تنشيف وتقسيم", slot: "٤ – ٨ بالليل", plan: "pro" }));
  await book(json("/api/bookings", { name: "منى خالد", phone: "01012345678", goal: "تخسيس وحرق دهون", slot: "٦ – ٩ الصبح", plan: "basic" }));
  await subscribe(
    json("/api/subscribe", {
      orderId: "FZ-ADM-001",
      planId: "pro",
      planName: "برو",
      cycle: "quarterly",
      months: 3,
      addonIds: ["coach", "nutrition"],
      coupon: "FIT10",
      total: 2870,
      perMonth: 956,
      payment: "card",
      member: { name: "منى خالد", phone: "01012345678", goal: "تخسيس" },
      endsAt: Date.now() + 90 * 86_400_000,
    }),
  );
  await subscribe(
    json("/api/subscribe", {
      orderId: "FZ-ADM-002",
      planId: "vip",
      planName: "VIP إليت",
      cycle: "yearly",
      months: 12,
      addonIds: [],
      total: 15000,
      perMonth: 1250,
      payment: "wallet",
      member: { name: "كريم عادل", phone: "01155554444", goal: "تجهيز لبطولة" },
      endsAt: Date.now() + 365 * 86_400_000,
    }),
  );
  // دفع: واحدة 3DS واتأكدت، واحدة مرفوضة، واحدة محفظة
  const r1 = await (await pay(json("/api/pay", { method: "card", amount: 2870, card: { number: "4242 4242 4242 4242" } }))).json();
  await confirm(json("/api/pay/confirm", { reference: r1.reference, code: "483920" }));
  await pay(json("/api/pay", { method: "card", amount: 500, card: { number: "4000 0000 0000 0002" } }));
  await pay(json("/api/pay", { method: "wallet", amount: 15000 }));
}

describe("جلسة الأدمن — التوقيع والتحقق", () => {
  it("التوكن بيتحقق، والمفبرك/المنتهي بيترفض", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
    expect(await verifySessionToken(undefined)).toBe(false);
    expect(await verifySessionToken("garbage")).toBe(false);
    expect(await verifySessionToken(`${token}x`)).toBe(false);

    // نفس الصيغة لكن توقيع مختلف
    const [exp] = token.split(".");
    expect(await verifySessionToken(`${exp}.${"0".repeat(64)}`)).toBe(false);

    // منتهي: بنولّد بوقت قديم
    const old = await createSessionToken(Date.now() - 48 * 3_600_000);
    expect(await verifySessionToken(old)).toBe(false);
  });

  it("safeEqual بتقارن صح ومش بتعتمد على الطول", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("باسورد التطوير الافتراضي شغال خارج الإنتاج", () => {
    expect(checkPassword("admin123")).toBe(true);
    expect(checkPassword("wrong")).toBe(false);
    expect(checkPassword("")).toBe(false);
  });
});

describe("POST /api/admin/session — الدخول والخروج", () => {
  it("باسورد صح → 200 + كوكي httpOnly", async () => {
    const res = await login(json("/api/admin/session", { password: "admin123" }, { headers: { "x-forwarded-for": "10.0.0.1" } }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ADMIN_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    // الكوكي اللي اتبعتت بتعدي التحقق
    const token = /fz_admin=([^;]+)/.exec(setCookie)?.[1] ?? "";
    expect(await verifySessionToken(decodeURIComponent(token))).toBe(true);
  });

  it("باسورد غلط → 401 + fields.password + عدد المحاولات المتبقية", async () => {
    const res = await login(json("/api/admin/session", { password: "nope" }, { headers: { "x-forwarded-for": "10.0.0.2" } }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("invalid_password");
    expect(body.fields.password).toBeTruthy();
    expect(body.attemptsLeft).toBe(4);
  });

  it("5 محاولات غلط → 429 + Retry-After", async () => {
    const headers = { "x-forwarded-for": "10.0.0.3" };
    for (let i = 0; i < 5; i++) await login(json("/api/admin/session", { password: "bad" }, { headers }));
    const res = await login(json("/api/admin/session", { password: "admin123" }, { headers }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect((await res.json()).code).toBe("locked");
  });

  it("فاضي → 422، مش JSON → 400", async () => {
    expect((await login(json("/api/admin/session", { password: "" }, { headers: { "x-forwarded-for": "10.0.0.4" } }))).status).toBe(422);
    const bad = new Request("http://local.test/api/admin/session", { method: "POST", body: "{nope", headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.5" } });
    expect((await login(bad)).status).toBe(400);
  });

  it("GET بيقول authenticated حسب الكوكي، و DELETE بيمسحها", async () => {
    const anon = await (await sessionInfo(json("/api/admin/session"))).json();
    expect(anon.authenticated).toBe(false);
    expect(anon.enabled).toBe(true);

    const authed = await (await sessionInfo(await asAdmin("/api/admin/session"))).json();
    expect(authed.authenticated).toBe(true);

    const out = await logout();
    expect((await out.json()).authenticated).toBe(false);
    expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  });
});

describe("الحارس — كل مسارات الأدمن بترجع 401 من غير جلسة", () => {
  it("overview / orders / bookings / payments / reset", async () => {
    for (const handler of [overview, adminOrders, adminBookings, adminPayments]) {
      const res = await handler(json("/api/admin/x"));
      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe("unauthorized");
    }
    expect((await reset(new Request("http://local.test/api/admin/reset", { method: "POST" }))).status).toBe(401);
  });
});

describe("GET /api/admin/overview — التجميع", () => {
  beforeEach(seed);

  it("الأرقام بتطابق البيانات المزروعة", async () => {
    const res = await overview(await asAdmin("/api/admin/overview"));
    expect(res.status).toBe(200);
    const o = await res.json();

    expect(o.orders.total).toBe(2);
    expect(o.revenue.total).toBe(17870);
    expect(o.revenue.avgOrder).toBe(8935);
    expect(o.revenue.vat).toBe(Math.round((17870 * 14) / 114));
    expect(o.orders.byPlan.find((p: { id: string }) => p.id === "pro")).toMatchObject({ count: 1, revenue: 2870 });
    expect(o.orders.byPlan.find((p: { id: string }) => p.id === "vip")).toMatchObject({ count: 1, revenue: 15000 });
    expect(o.orders.byCycle).toEqual({ quarterly: 1, yearly: 1 });
    expect(o.orders.byPayment).toEqual({ card: 1, wallet: 1 });
    expect(o.orders.addons.map((a: { id: string }) => a.id).sort()).toEqual(["coach", "nutrition"]);
    expect(o.orders.coupons).toEqual([{ code: "FIT10", count: 1 }]);

    expect(o.bookings.total).toBe(2);
    expect(o.bookings.byGoal).toHaveLength(2);

    expect(o.payments.total).toBe(3);
    expect(o.payments.succeeded).toBe(2); // 3DS اتأكدت + محفظة
    expect(o.payments.failed).toBe(1);
    expect(o.payments.requiresAction).toBe(0);
    expect(o.payments.volume).toBe(2870 + 15000);
    expect(o.payments.declineCodes).toEqual([{ code: "card_declined", count: 1 }]);
    expect(o.payments.byBrand).toEqual({ visa: 2 });

    expect(o.daily).toHaveLength(7);
    expect(o.daily[6].orders).toBe(2); // النهارده آخر عمود
    expect(o.sandbox).toBe(true);
  });

  it("buildOverview على قاعدة فاضية مش بتكسر", () => {
    resetDb();
    const o = buildOverview();
    expect(o.revenue).toEqual({ total: 0, today: 0, week: 0, avgOrder: 0, vat: 0 });
    expect(o.orders.byPlan.every((p) => p.count === 0)).toBe(true);
    expect(o.daily.every((d) => d.revenue === 0)).toBe(true);
  });

  it("سجل الدفع مبيخزّنش رقم الكارت — آخر 4 أرقام بس", () => {
    for (const p of db.intents.values()) {
      expect(JSON.stringify(p)).not.toContain("4242424242424242");
      expect(JSON.stringify(p)).not.toContain("4242 4242");
      if (p.method === "card") expect(p.last4).toMatch(/^\d{4}$/);
    }
  });
});

describe("قوائم الأدمن — بحث وفلترة وترقيم و CSV", () => {
  beforeEach(seed);

  it("orders: بحث بالاسم والفلترة بالحالة", async () => {
    const all = await (await adminOrders(await asAdmin("/api/admin/orders"))).json();
    expect(all.total).toBe(2);
    expect(all.items[0].orderId).toBe("FZ-ADM-002"); // الأحدث الأول

    const q = await (await adminOrders(await asAdmin("/api/admin/orders?q=منى"))).json();
    expect(q.total).toBe(1);
    expect(q.items[0].orderId).toBe("FZ-ADM-001");

    const coupon = await (await adminOrders(await asAdmin("/api/admin/orders?q=fit10"))).json();
    expect(coupon.total).toBe(1);

    const none = await (await adminOrders(await asAdmin("/api/admin/orders?status=cancelled"))).json();
    expect(none.total).toBe(0);
    expect(none.items).toEqual([]);
  });

  it("bookings: بحث بالموبايل + CSV بـ BOM وهيدر عربي", async () => {
    const byPhone = await (await adminBookings(await asAdmin("/api/admin/bookings?q=0109999"))).json();
    expect(byPhone.total).toBe(1);
    expect(byPhone.items[0].name).toBe("أحمد سمير");

    const csv = await adminBookings(await asAdmin("/api/admin/bookings?format=csv"));
    expect(csv.headers.get("content-type")).toContain("text/csv");
    expect(csv.headers.get("content-disposition")).toContain("attachment");
    // الـ BOM موجود في البايتات (Excel محتاجه) — `text()` بيشيله أثناء فك الترميز، فبنفحص البايتات
    const bytes = new Uint8Array(await csv.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.slice(1).split("\r\n");
    expect(lines[0].startsWith("الكود,الاسم,الموبايل")).toBe(true);
    expect(lines).toHaveLength(3); // هيدر + 2 صفوف
  });

  it("payments: فلترة بالحالة وبحث بآخر 4 أرقام", async () => {
    const failed = await (await adminPayments(await asAdmin("/api/admin/payments?status=failed"))).json();
    expect(failed.total).toBe(1);
    expect(failed.items[0].code).toBe("card_declined");
    expect(failed.items[0].last4).toBe("0002");

    const last4 = await (await adminPayments(await asAdmin("/api/admin/payments?q=4242"))).json();
    expect(last4.total).toBe(1);
    expect(last4.items[0].status).toBe("succeeded");
  });

  it("ترقيم الصفحات: per بيتحد بين 5 و100 والصفحة مبتطلعش برّه المدى", async () => {
    const p = await (await adminOrders(await asAdmin("/api/admin/orders?per=1&page=9"))).json();
    expect(p.per).toBe(5); // الحد الأدنى
    expect(p.page).toBe(1);
    expect(p.pages).toBe(1);

    const q = parseListQuery("http://x/api?per=500&page=0&format=csv&q=  Ahmed ");
    expect(q).toMatchObject({ per: 100, page: 1, format: "csv", q: "ahmed" });
  });

  it("POST /api/admin/reset بيمسح كل حاجة", async () => {
    const res = await reset(new Request("http://local.test/api/admin/reset", { method: "POST", headers: await adminCookie() }));
    expect(res.status).toBe(200);
    expect(db.orders).toHaveLength(0);
    expect(db.bookings).toHaveLength(0);
    expect(db.intents.size).toBe(0);
  });
});

describe("أدوات القوائم الصافية", () => {
  it("matches: بحث غير حساس لحالة الأحرف وبيقبل أرقام", () => {
    expect(matches("ahm", "Ahmed", null, 5)).toBe(true);
    expect(matches("500", "x", 500)).toBe(true);
    expect(matches("", null)).toBe(true);
    expect(matches("zzz", "abc", undefined)).toBe(false);
  });

  it("paginate بيقص صح", () => {
    const rows = Array.from({ length: 23 }, (_, i) => i);
    const q = { q: "", status: "", page: 3, per: 10, format: "json" as const };
    expect(paginate(rows, q)).toMatchObject({ items: [20, 21, 22], page: 3, pages: 3, total: 23 });
  });

  it("toCsv بيهرّب الفواصل والاقتباسات ويمنع حقن الصيغ", () => {
    const out = toCsv(["a", "b"], [["x,y", 'he said "hi"'], ["=SUM(A1)", null]]);
    const lines = out.slice(1).split("\r\n");
    expect(lines[1]).toBe('"x,y","he said ""hi"""');
    expect(lines[2]).toBe("'=SUM(A1),");
  });
});
