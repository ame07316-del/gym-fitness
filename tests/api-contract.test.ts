import { describe, expect, it } from "vitest";
import { POST as book, validateBooking } from "@/app/api/bookings/route";
import { POST as subscribe } from "@/app/api/subscribe/route";
import { GET as payHealth, POST as pay } from "@/app/api/pay/route";
import { POST as confirm } from "@/app/api/pay/confirm/route";
import { isEGPhone } from "@/app/lib/utils";

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

describe("POST /api/subscribe", () => {
  const order = {
    orderId: "FZ-TEST01",
    planName: "برو",
    cycle: "yearly",
    months: 12,
    addonIds: ["coach"],
    coupon: "FIT10",
    total: 9603,
    perMonth: 800,
    payment: "card",
    member: { name: "منى خالد", phone: "01012345678", goal: "تنشيف" },
  };

  it("201 + رقم فاتورة مشتق من الـ orderId", async () => {
    const res = await subscribe(post(order));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.order.orderId).toBe("FZ-TEST01");
    expect(body.order.status).toBe("active");
    expect(body.invoice).toBe("INV-FZ-TEST01");
  });

  it("422 على بيانات عضو غلط (نفس شكل الـ fields)", async () => {
    const res = await subscribe(post({ ...order, member: { name: "م", phone: "12345" } }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.fields.phone).toBeTruthy();
  });

  it("422 على إجمالي مش منطقي", async () => {
    expect((await subscribe(post({ ...order, total: 0 }))).status).toBe(422);
    expect((await subscribe(post({ ...order, total: -50 }))).status).toBe(422);
  });
});

describe("POST /api/pay — سلوك البوابة", () => {
  it("4242 → requires_action (3-D Secure) ومعاه OTP hint", async () => {
    const res = await pay(post({ method: "card", amount: 9603, card: { number: "4242 4242 4242 4242" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("requires_action");
    expect(body.brand).toBe("visa");
    expect(body.last4).toBe("4242");
    expect(body.otpHint).toBeTruthy();
    expect(body.reference).toMatch(/^pi_s1_/);
  });

  it("أرقام الرفض → 402 و code الصح والـ reference لسه راجع", async () => {
    const res = await pay(post({ method: "card", amount: 100, card: { number: "4000 0000 0000 0002" } }));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("card_declined");
    expect(body.message).toContain("card_declined");
  });

  it("Luhn فاشل server-side → invalid_number", async () => {
    const body = await (await pay(post({ method: "card", amount: 100, card: { number: "1234 5678 9012 3456" } }))).json();
    expect(body.code).toBe("invalid_number");
  });

  it("mada بيتعرف في الشعار", async () => {
    const body = await (await pay(post({ method: "card", amount: 570, card: { number: "5080 1234 1234 1234" } }))).json();
    expect(body.brand).toBe("mada");
  });

  it("محفظة/كاش → succeeded من غير 3DS", async () => {
    const wallet = await (await pay(post({ method: "wallet", amount: 570 }))).json();
    expect(wallet.status).toBe("succeeded");
    const cash = await (await pay(post({ method: "cash", amount: 570 }))).json();
    expect(cash.status).toBe("succeeded");
    expect(cash.message).toContain("48");
  });

  it("من غير amount → 422", async () => {
    expect((await pay(post({ method: "card", card: { number: "4242424242424242" } }))).status).toBe(422);
  });

  it("GET /api/pay = health بيقول sandbox", async () => {
    const body = await (await payHealth()).json();
    expect(body.sandbox).toBe(true);
    expect(body.provider).toBe("sandbox");
  });
});

describe("POST /api/pay/confirm — خطوة الـ OTP", () => {
  const begin = async () => {
    const body = await (await pay(post({ method: "card", amount: 2870, card: { number: "5555 5555 5555 4444" } }))).json();
    return body.reference as string;
  };

  it("رمز 000000 → 401 (اختبار الفشل الأول)", async () => {
    const reference = await begin();
    const res = await confirm(post({ reference, code: "000000" }));
    expect(res.status).toBe(401);
    expect((await res.json()).status).toBe("requires_action");
  });

  it("رمز صحيح → 200 succeeded، والتاني بيطلع «متأكد عليها بالفعل»", async () => {
    const reference = await begin();
    const ok = await (await confirm(post({ reference, code: "483920" }))).json();
    expect(ok.status).toBe("succeeded");
    expect(ok.amount).toBe(2870);
    const again = await confirm(post({ reference, code: "111111" }));
    expect(again.status).toBe(200);
    expect((await again.json()).message).toContain("بالفعل");
  });

  it("reference غير موجود → 404 برسالة تفهم المستخدم يبدأ من جديد", async () => {
    const res = await confirm(post({ reference: "pi_s1_مفبرك", code: "123456" }));
    expect(res.status).toBe(404);
    expect((await res.json()).message).toContain("من جديد");
  });
});
