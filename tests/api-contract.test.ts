import { describe, expect, it } from "vitest";
import { POST as book, validateBooking } from "@/app/api/bookings/route";
import { POST as subscribe } from "@/app/api/subscribe/route";
import { POST as quote } from "@/app/api/quote/route";
import { isEGPhone } from "@/app/lib/utils";
import { quoteOf } from "@/app/lib/subscription";

/**
 * اختبارات العقد (docs/BACKEND-CONTRACT.md) على الهاندلرات المحلية نفسها —
 * بتنادي الـ route handler مباشرة بدون سيرفر. أي باك إند خارجي (Laravel/Node)
 * المفروض يعدي نفس الـ assertions دي بالظبط، وده معناه إن الفرونت هيمشي معاه.
 */
const post = (body: unknown) =>
  new Request("http://local.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("validateBooking / isEGPhone — التحقّق المشترك", () => {
  it("اسم أقصر من 3 أو موبايل مش مصري = أخطاء باسم الحقل", () => {
    expect(validateBooking({ name: "خ", phone: "123456" }).errors).toMatchObject({
      name: expect.any(String),
      phone: expect.any(String),
    });
    expect(validateBooking({ name: "منى خالد", phone: "01012345678" }).errors).toEqual({});
  });

  it("بتقبل +201… و 00201… والمسافات والشرطات", () => {
    for (const ok of ["01012345678", "+201012345678", "00201012345678", "010 1234 5678", "010-1234-5678"]) {
      expect(isEGPhone(ok)).toBe(true);
    }
    expect(isEGPhone("0111234567")).toBe(false); // 9 أرقام
    expect(isEGPhone("0212345678")).toBe(false); // خط أرضي
    expect(validateBooking({ name: "اختبار", phone: "01012345678 " }).phone).toBe("01012345678");
  });
});

describe("POST /api/bookings", () => {
  it("201 + الحجز بيتأكد", async () => {
    const res = await book(post({ name: "أحمد سمير", phone: "01099998888", goal: "تنشيف", slot: "٦ م" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.booking.status).toBe("confirmed");
    expect(body.booking.name).toBe("أحمد سمير");
    expect(body.booking.id).toMatch(/^BK-/);
  });

  it("422 + fields لكل حقل غلط", async () => {
    const res = await book(post({ name: "ع", phone: "010123" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(Object.keys(body.fields).sort()).toEqual(["name", "phone"]);
  });

  it("body مش JSON → 400 مش كراش", async () => {
    const res = await book(post("{ليس json"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/subscribe — السعر بيتحسب على السيرفر", () => {
  const order = {
    planId: "pro",
    cycle: "yearly",
    addonIds: ["nutrition"],
    coupon: "FIT10",
    payment: "wallet",
    paymentRef: "01012345678",
    member: { name: "منى خالد", phone: "01012345678", goal: "تنشيف" },
  };

  /** نفس الحسبة اللي المفروض السيرفر يطلعها (الفلوس بتتخزن بالجنيه الصحيح) */
  const q = quoteOf({ planId: "pro", cycle: "yearly", addonIds: ["nutrition"], coupon: "FIT10" });
  const expected = { total: Math.round(q.total), perMonth: Math.round(q.perMonth) };

  it("201 + رقم طلب من السيرفر + إجمالي محسوب + حالة pending", async () => {
    const res = await subscribe(post(order));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.order.orderId).toMatch(/^FZ-/);
    expect(body.order.status).toBe("pending"); // مايتفعلش غير بعد تأكيد الإدارة
    expect(body.order.total).toBe(expected.total);
    expect(body.order.perMonth).toBe(expected.perMonth);
    expect(body.order.months).toBe(12);
    expect(body.invoice).toBe(`INV-${body.order.orderId}`);
  });

  it("🔒 أي total/perMonth/months/endsAt جاي من العميل بيتتجاهل", async () => {
    const res = await subscribe(post({ ...order, total: 1, perMonth: 1, months: 99, endsAt: Date.now() + 9e11 }));
    const body = await res.json();
    expect(body.order.total).toBe(expected.total);
    expect(body.order.perMonth).toBe(expected.perMonth);
    expect(body.order.months).toBe(12);
    expect(body.order.endsAt).toBeLessThan(Date.now() + 400 * 86_400_000);
  });

  it("🔒 العميل مايقدرش يفرض رقم طلب (orderId) بتاعه", async () => {
    const body = await (await subscribe(post({ ...order, orderId: "FZ-HACK" }))).json();
    expect(body.order.orderId).not.toBe("FZ-HACK");
  });

  it("422 على بيانات عضو غلط (نفس شكل الـ fields)", async () => {
    const res = await subscribe(post({ ...order, member: { name: "م", phone: "12345" } }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.fields.phone).toBeTruthy();
  });

  it("422 على باقة/مدة/إضافة مش موجودة", async () => {
    expect((await subscribe(post({ ...order, planId: "platinum" }))).status).toBe(422);
    expect((await subscribe(post({ ...order, cycle: "weekly" }))).status).toBe(422);
    expect((await subscribe(post({ ...order, addonIds: ["free-ferrari"] }))).status).toBe(422);
  });

  it("422 على كوبون غلط بدل ما يعدّي بسعر تاني", async () => {
    const res = await subscribe(post({ ...order, coupon: "FREE100" }));
    expect(res.status).toBe(422);
    expect((await res.json()).fields.coupon).toBeTruthy();
  });

  it("422 على طريقة دفع مش متاحة (الفيزا اتشالت خالص)", async () => {
    for (const payment of ["card", "install", "bitcoin"]) {
      const res = await subscribe(post({ ...order, payment }));
      expect(res.status).toBe(422);
      expect((await res.json()).fields.payment).toBeTruthy();
    }
  });
});

describe("POST /api/quote — التسعيرة الرسمية", () => {
  it("بترجّع نفس أرقام محرك التسعير", async () => {
    const draft = { planId: "vip", cycle: "quarterly", addonIds: ["inbody"], coupon: null };
    const res = await quote(post(draft));
    expect(res.status).toBe(200);
    const body = await res.json();
    const expected = quoteOf(draft as never);
    expect(body.quote.total).toBe(expected.total);
    expect(body.quote.vat).toBe(expected.vat);
    expect(body.quote.months).toBe(3);
  });

  it("422 على باقة مش موجودة", async () => {
    const res = await quote(post({ planId: "ghost", cycle: "monthly", addonIds: [] }));
    expect(res.status).toBe(422);
    expect((await res.json()).fields.planId).toBeTruthy();
  });

  it("بترجّع سبب رفض الكوبون من غير ما تكسر التسعيرة", async () => {
    const body = await (await quote(post({ planId: "basic", cycle: "monthly", addonIds: [], coupon: "NEW25" }))).json();
    expect(body.quote.couponError).toBeTruthy();
    expect(body.quote.couponDiscount).toBe(0);
  });
});
