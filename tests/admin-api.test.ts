import { beforeAll, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/admin/auth/login/route";
import { GET as me } from "@/app/api/admin/auth/me/route";
import { GET as listSubs } from "@/app/api/admin/subscriptions/route";
import { DELETE as removeSub, PATCH as patchSub } from "@/app/api/admin/subscriptions/[orderId]/route";
import { GET as listUsers, POST as createUser } from "@/app/api/admin/users/route";
import { PATCH as patchUser } from "@/app/api/admin/users/[id]/route";
import { GET as adminStats } from "@/app/api/admin/stats/route";
import { GET as publicSubs } from "@/app/api/subscribe/route";
import { GET as publicBookings } from "@/app/api/bookings/route";

/**
 * اختبارات الصلاحيات والأمان على لوحة الإدارة.
 * بتشتغل على قاعدة SQLite في الذاكرة (شوف vitest.config.ts) وبتنادي الـ handlers
 * مباشرة — مفيش سيرفر ومفيش متصفح.
 */

type Session = { cookie: string; csrf: string; body: Record<string, unknown> };

const BASE = "http://local.test";

function request(path: string, init: { method?: string; body?: unknown; session?: Session | null; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", ...(init.headers ?? {}) };
  if (init.session) {
    headers.cookie = init.session.cookie;
    headers["x-csrf-token"] = init.session.csrf;
  }
  return new Request(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function signIn(email: string, password: string): Promise<Session> {
  const res = await login(request("/api/admin/auth/login", { method: "POST", body: { email, password } }));
  const body = (await res.json()) as Record<string, unknown>;
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(body)}`);
  const setCookie = res.headers.getSetCookie();
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  return { cookie, csrf: body.csrfToken as string, body };
}

const DEMO = {
  owner: { email: "owner@fitzone.pro", password: "Owner#Fit2026" },
  admin: { email: "manager@fitzone.pro", password: "Manager#Fit2026" },
  coach: { email: "coach.ahmed@fitzone.pro", password: "Coach#Fit2026" },
  reception: { email: "reception@fitzone.pro", password: "Front#Fit2026" },
};

let owner: Session;
let admin: Session;
let coach: Session;
let reception: Session;

beforeAll(async () => {
  owner = await signIn(DEMO.owner.email, DEMO.owner.password);
  admin = await signIn(DEMO.admin.email, DEMO.admin.password);
  coach = await signIn(DEMO.coach.email, DEMO.coach.password);
  reception = await signIn(DEMO.reception.email, DEMO.reception.password);
});

/* ================================ الدخول ================================ */

describe("تسجيل الدخول", () => {
  it("كلمة سر غلط → 401 برسالة عامة (مفيش كشف إن الإيميل موجود)", async () => {
    const res = await login(request("/api/admin/auth/login", { method: "POST", body: { email: DEMO.owner.email, password: "غلط-خالص1" } }));
    const wrongEmail = await login(request("/api/admin/auth/login", { method: "POST", body: { email: "nobody@fitzone.pro", password: "غلط-خالص1" } }));
    expect(res.status).toBe(401);
    expect(wrongEmail.status).toBe(401);
    expect((await res.json()).error).toBe((await wrongEmail.json()).error);
  });

  it("الدخول الناجح بيرجع كوكي HttpOnly + توكن CSRF + الصلاحيات", async () => {
    const res = await login(request("/api/admin/auth/login", { method: "POST", body: DEMO.reception }));
    const cookies = res.headers.getSetCookie().join(" | ");
    expect(res.status).toBe(200);
    expect(cookies).toContain("fz_session=");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("SameSite=Strict");
    const body = await res.json();
    expect(body.csrfToken).toBeTruthy();
    expect(body.user.role).toBe("reception");
    expect(body.user).not.toHaveProperty("password_hash");
  });

  it("طلب من Origin تاني بيترفض (CSRF/CORS)", async () => {
    const res = await login(
      request("/api/admin/auth/login", { method: "POST", body: DEMO.owner, headers: { origin: "https://evil.example", host: "local.test" } }),
    );
    expect(res.status).toBe(403);
  });

  it("الحساب بيتقفل بعد ٥ محاولات فاشلة", async () => {
    const email = "manager@fitzone.pro";
    for (let i = 0; i < 5; i++) {
      await login(request("/api/admin/auth/login", { method: "POST", body: { email, password: `مش-صح${i}` } }));
    }
    const locked = await login(request("/api/admin/auth/login", { method: "POST", body: { email, password: DEMO.admin.password } }));
    expect(locked.status).toBe(423);
    expect((await locked.json()).code).toBe("locked");
  });
});

/* ============================ حماية المسارات العامة ============================ */

describe("المسارات اللي كانت بتسرّب بيانات", () => {
  it("GET /api/subscribe و /api/bookings محتاجين جلسة دلوقتي", async () => {
    expect((await publicSubs(request("/api/subscribe"))).status).toBe(401);
    expect((await publicBookings(request("/api/bookings"))).status).toBe(401);
  });

  it("بجلسة مدير الفرع بيرجعوا 200", async () => {
    expect((await publicSubs(request("/api/subscribe", { session: owner }))).status).toBe(200);
    expect((await publicBookings(request("/api/bookings", { session: owner }))).status).toBe(200);
  });
});

/* ================================ نطاق الرؤية ================================ */

describe("كل دور بيشوف إيه", () => {
  it("الكوتش بيشوف أعضاءه هو بس", async () => {
    const res = await listSubs(request("/api/admin/subscriptions", { session: coach }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.scope).toBe("own");
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((s: { coachName: string | null }) => s.coachName === "كابتن أحمد السيد")).toBe(true);
  });

  it("المدير العام بيشوف الكل ومعاه الفلوس", async () => {
    const res = await listSubs(request("/api/admin/subscriptions", { session: owner }));
    const body = await res.json();
    expect(body.scope).toBe("all");
    expect(body.items.length).toBeGreaterThanOrEqual(5);
    expect(body.items[0].total).toBeTypeOf("number");
  });

  it("الاستقبال بيشوف الاشتراكات من غير مبالغ والتليفون متخفي جزئيًا", async () => {
    const res = await listSubs(request("/api/admin/subscriptions", { session: reception }));
    const body = await res.json();
    expect(body.items[0].total).toBeNull();
    expect(body.items[0].member.phone).toContain("•");

    const stats = await adminStats(request("/api/admin/stats", { session: reception }));
    expect((await stats.json()).subscriptions.revenue).toBeNull();
  });

  it("الكوتش ممنوع من قائمة المستخدمين", async () => {
    expect((await listUsers(request("/api/admin/users", { session: coach }))).status).toBe(403);
    expect((await listUsers(request("/api/admin/users", { session: owner }))).status).toBe(200);
  });
});

/* ============================== إدارة الاشتراكات ============================== */

describe("إلغاء وحذف الاشتراكات", () => {
  const target = "FZ-2026-DEMO02";
  const params = (orderId: string) => ({ params: Promise.resolve({ orderId }) });

  it("من غير جلسة → 401", async () => {
    const res = await patchSub(request(`/api/admin/subscriptions/${target}`, { method: "PATCH", body: { action: "cancel" } }), params(target));
    expect(res.status).toBe(401);
  });

  it("من غير توكن CSRF → 403 حتى لو الكوكي صح", async () => {
    const res = await patchSub(
      new Request(`${BASE}/api/admin/subscriptions/${target}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: owner.cookie },
        body: JSON.stringify({ action: "cancel" }),
      }),
      params(target),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("csrf");
  });

  it("الكوتش ما يقدرش يلغي (403) — ومدير الفرع يقدر", async () => {
    const forbidden = await patchSub(
      request(`/api/admin/subscriptions/${target}`, { method: "PATCH", body: { action: "cancel" }, session: coach }),
      params(target),
    );
    expect(forbidden.status).toBe(403);

    const ok = await patchSub(
      request(`/api/admin/subscriptions/${target}`, { method: "PATCH", body: { action: "cancel", reason: "طلب العضو" }, session: admin }),
      params(target),
    );
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.subscription.status).toBe("cancelled");
    expect(body.subscription.cancelReason).toBe("طلب العضو");
  });

  it("إلغاء مرتين → 409", async () => {
    const res = await patchSub(request(`/api/admin/subscriptions/${target}`, { method: "PATCH", body: { action: "cancel" }, session: admin }), params(target));
    expect(res.status).toBe(409);
  });

  it("الحذف النهائي للمدير العام بس", async () => {
    const denied = await removeSub(request(`/api/admin/subscriptions/${target}`, { method: "DELETE", session: admin }), params(target));
    expect(denied.status).toBe(403);

    const done = await removeSub(request(`/api/admin/subscriptions/${target}`, { method: "DELETE", session: owner }), params(target));
    expect(done.status).toBe(200);

    const gone = await removeSub(request(`/api/admin/subscriptions/${target}`, { method: "DELETE", session: owner }), params(target));
    expect(gone.status).toBe(404);
  });

  it("حركة مش معروفة → 400", async () => {
    const res = await patchSub(
      request(`/api/admin/subscriptions/FZ-2026-DEMO01`, { method: "PATCH", body: { action: "drop-database" }, session: owner }),
      params("FZ-2026-DEMO01"),
    );
    expect(res.status).toBe(400);
  });
});

/* ======================== تأكيد الدفع (بدل بوابة الكروت) ======================== */

describe("تأكيد استلام الدفع", () => {
  const pending = "FZ-2026-DEMO06";
  const params = (orderId: string) => ({ params: Promise.resolve({ orderId }) });

  it("الاشتراك الجديد بيبدأ pending ومابيتحسبش في الإيراد", async () => {
    const stats = await (await adminStats(request("/api/admin/stats", { session: owner }))).json();
    expect(stats.subscriptions.pending).toBeGreaterThan(0);

    const list = await (await listSubs(request("/api/admin/subscriptions?status=pending", { session: owner }))).json();
    expect(list.items.some((s: { orderId: string }) => s.orderId === pending)).toBe(true);
  });

  it("الكوتش ما يقدرش يأكد الدفع (403)", async () => {
    const res = await patchSub(
      request(`/api/admin/subscriptions/${pending}`, { method: "PATCH", body: { action: "confirm_payment" }, session: coach }),
      params(pending),
    );
    expect(res.status).toBe(403);
  });

  it("الاستقبال كمان ممنوع — الصلاحية لمدير الفرع فما فوق", async () => {
    const res = await patchSub(
      request(`/api/admin/subscriptions/${pending}`, { method: "PATCH", body: { action: "confirm_payment" }, session: reception }),
      params(pending),
    );
    expect(res.status).toBe(403);
  });

  it("مدير الفرع بيأكد الدفع → active، والتأكيد التاني 409", async () => {
    const ok = await patchSub(
      request(`/api/admin/subscriptions/${pending}`, { method: "PATCH", body: { action: "confirm_payment" }, session: admin }),
      params(pending),
    );
    expect(ok.status).toBe(200);
    expect((await ok.json()).subscription.status).toBe("active");

    const again = await patchSub(
      request(`/api/admin/subscriptions/${pending}`, { method: "PATCH", body: { action: "confirm_payment" }, session: admin }),
      params(pending),
    );
    expect(again.status).toBe(409);
  });

  it("اشتراك نشط أصلاً ما ينفعش يتأكد دفعه (409)", async () => {
    const res = await patchSub(
      request(`/api/admin/subscriptions/FZ-2026-DEMO03`, { method: "PATCH", body: { action: "confirm_payment" }, session: owner }),
      params("FZ-2026-DEMO03"),
    );
    expect(res.status).toBe(409);
  });
});

/* ============================== إدارة المستخدمين ============================== */

describe("المستخدمون والجلسات", () => {
  it("مدير الفرع ما يقدرش ينشئ مستخدم (403)", async () => {
    const res = await createUser(
      request("/api/admin/users", { method: "POST", body: { name: "حد جديد", email: "x@fitzone.pro", role: "coach", password: "Strong#Pass99" }, session: admin }),
    );
    expect(res.status).toBe(403);
  });

  it("المدير العام بينشئ كوتش، والكوتش يقدر يدخل بكلمة السر المؤقتة", async () => {
    const res = await createUser(
      request("/api/admin/users", {
        method: "POST",
        body: { name: "كابتن نور", email: "coach.nour@fitzone.pro", phone: "01011122233", role: "coach", trainerSlug: "nour", password: "Nour#Coach2026" },
        session: owner,
      }),
    );
    expect(res.status).toBe(201);
    const created = (await res.json()).user;
    expect(created.mustChangePassword).toBe(true);

    const session = await signIn("coach.nour@fitzone.pro", "Nour#Coach2026");
    expect((session.body.user as { role: string }).role).toBe("coach");

    // تعطيل الحساب بيقتل جلسته فورًا
    const off = await patchUser(request(`/api/admin/users/${created.id}`, { method: "PATCH", body: { active: false }, session: owner }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(off.status).toBe(200);
    expect((await me(request("/api/admin/auth/me", { session }))).status).toBe(401);
  });

  it("كلمة سر ضعيفة → 422 مع رسالة تحت الحقل", async () => {
    const res = await createUser(
      request("/api/admin/users", { method: "POST", body: { name: "ضعيف", email: "weak@fitzone.pro", role: "reception", password: "12345" }, session: owner }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).fields.password).toBeTruthy();
  });

  it("المدير العام ما يقدرش يوقف أو يمسح نفسه", async () => {
    const meRes = await me(request("/api/admin/auth/me", { session: owner }));
    const id = (await meRes.json()).user.id as string;
    const res = await patchUser(request(`/api/admin/users/${id}`, { method: "PATCH", body: { active: false }, session: owner }), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(422);
  });
});
