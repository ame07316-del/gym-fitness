import { describe, expect, it } from "vitest";
import { addMonths, cardPattern, findCycle, findPlan, matchCoupon, quoteOf } from "@/app/lib/subscription";

/**
 * اختبارات محرك الأسعار — دي أهم حاجة في المشروع كله، فأي تعديل في
 * CYCLES / COUPONS / ADDONS / VAT_RATE لازم يكسر اختبار هنا.
 */
const draft = (over: Partial<Parameters<typeof quoteOf>[0]> = {}) => ({
  planId: "pro" as const,
  cycle: "monthly" as const,
  addonIds: [] as string[],
  coupon: null as string | null,
  ...over,
});

describe("الأساسيات", () => {
  it("شهري بدون إضافات = السعر + 14% ضريبة بالظبط", () => {
    const q = quoteOf(draft({ planId: "basic" }));
    expect(q.subtotal).toBe(500);
    expect(q.cycleDiscount).toBe(0);
    expect(q.vat).toBeCloseTo(70, 6);
    expect(q.total).toBeCloseTo(570, 6);
    expect(q.saved).toBe(0); // بعد التقريب مش هتلاقي غبار فلو팅 بوانت // الشهري مفيهوش توفير بالنسبة لنفسه
  });

  it("السنوي بيدي أكبر خصم مدة (22%)", () => {
    const q = quoteOf(draft({ cycle: "yearly" }));
    expect(q.months).toBe(12);
    expect(q.subtotal).toBe(10800); // 900 × 12
    expect(q.cycleDiscount).toBeCloseTo(2376, 6); // 22%
    expect(q.net).toBeCloseTo(8424, 6);
    expect(q.total).toBeCloseTo(9603.36, 2);
    expect(q.saved).toBeGreaterThan(2000);
    expect(q.savedPct).toBeGreaterThan(0.2); // الخصم بيتقرب من 22%
  });

  it("الإضافات بتتحسب لكل شهر في مدة الاشتراك", () => {
    const q = quoteOf(draft({ cycle: "monthly", addonIds: ["coach", "nutrition"] }));
    expect(q.addonsMonthly).toBe(500); // 300 + 200
    expect(q.subtotal).toBe(1400); // 900 + 500×1
    const q6 = quoteOf(draft({ cycle: "semiannual", addonIds: ["coach", "nutrition"] }));
    expect(q6.subtotal).toBe(5400 + 3000); // (900×6) + (500×6)
    expect(q6.cycleDiscount).toBeCloseTo(5400 * 0.14, 6); // الخصم على الباقة بس
  });

  it("كل الباقات وكل المدد بيرجعوا إجمالي موجب ومتسق", () => {
    for (const planId of ["basic", "pro", "vip"] as const) {
      for (const cycle of ["monthly", "quarterly", "semiannual", "yearly"] as const) {
        const q = quoteOf(draft({ planId, cycle }));
        expect(q.total).toBeGreaterThan(0);
        expect(q.total).toBeCloseTo(q.net + q.vat, 6);
        expect(q.perMonth * q.months).toBeCloseTo(q.total, 4);
        expect(q.total).toBeLessThanOrEqual(q.monthlyIfMonthly * q.months + 0.01);
      }
    }
  });
});

describe("الكوبونات", () => {
  it("FIT10 = 10% بعد خصم المدة", () => {
    const q = quoteOf(draft({ cycle: "quarterly", coupon: "FIT10" }));
    const afterCycle = 2700 - 2700 * 0.08;
    expect(q.coupon?.code).toBe("FIT10");
    expect(q.couponError).toBeNull();
    expect(q.couponDiscount).toBeCloseTo(afterCycle * 0.1, 6);
    expect(q.total).toBeCloseTo(afterCycle * 0.9 * 1.14, 2);
  });

  it("NEW25 محكوم بحد أقصى 1500 جنيه", () => {
    const q = quoteOf(draft({ cycle: "yearly", coupon: "NEW25" }));
    expect(q.couponDiscount).toBe(1500); // 8424 × 25% = 2106 → بيتقفّل على 1500
    expect(q.net).toBeCloseTo(8424 - 1500, 6);
  });

  it("تحت الحد الأدنى الكوبون ما يشتغلش ويرجع رسالة خطأ", () => {
    const q = quoteOf(draft({ planId: "basic", cycle: "quarterly", coupon: "YEAR20" })); // min 4000
    expect(q.coupon).not.toBeNull();
    expect(q.couponDiscount).toBe(0);
    expect(q.couponError).toBeTruthy(); // الرسالة فيها الحد الأدنى بالأرقام العربية
    expect(q.total).toBeCloseTo(1500 * 0.92 * 1.14, 2);
  });

  it("كود غلط = رسالة + صفر خصم", () => {
    const q = quoteOf(draft({ coupon: "RAMADAN99" }));
    expect(q.coupon).toBeNull();
    expect(q.couponDiscount).toBe(0);
    expect(q.couponError).toBeTruthy();
  });

  it("الكود بيتقرأ بحروف صغيرة أو بحول", () => {
    expect(matchCoupon(" fit10 ")?.code).toBe("FIT10");
    expect(matchCoupon("  noPE  ")).toBeNull();
    expect(quoteOf(draft({ coupon: "  fit10 " })).couponDiscount).toBeGreaterThan(0);
  });
});

describe("تواريخ العضوية وكارت العضو", () => {
  it("31 يناير + شهر = 28 فبراير (من غير ما يقفز لشهر تاني)", () => {
    const ts = new Date(2025, 0, 31, 12).getTime();
    const out = new Date(addMonths(ts, 1));
    expect(out.getFullYear()).toBe(2025);
    expect(out.getMonth()).toBe(1);
    expect(out.getDate()).toBe(28);
  });

  it("31 مارس + شهر = 30 أبريل", () => {
    const out = new Date(addMonths(new Date(2025, 2, 31, 12).getTime(), 1));
    expect(out.getMonth()).toBe(3);
    expect(out.getDate()).toBe(30);
  });

  it("سنة كاملة = 12 شهر من يوم البداية", () => {
    const out = new Date(addMonths(new Date(2026, 8, 15, 12).getTime(), 12));
    expect(out.getFullYear()).toBe(2027);
    expect(out.getMonth()).toBe(8);
    expect(out.getDate()).toBe(15);
  });

  it("نمط الكارت ثابت لنفس الـ id ومختلف بين عضوين", () => {
    const a = cardPattern("FZ-AAA111");
    const b = cardPattern("FZ-AAA111");
    const c = cardPattern("FZ-BBB222");
    expect(a).toEqual(b);
    expect(a).toHaveLength(9);
    expect(a.every((row) => row.length === 9)).toBe(true);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });
});

describe("رجوع افتراضي آمن (عشان الـ localStorage ممكن يبلّغ بيانات بايظة)", () => {
  it("باقة مش موجودة → برو، ومدة مش موجودة → شهري", () => {
    expect(findPlan("nope" as never).id).toBe("pro");
    expect(findCycle("nope" as never).months).toBe(1);
  });
});
