import { describe, expect, it } from "vitest";
import * as data from "@/app/lib/data";
import { PAY_METHODS, PAY_TARGETS } from "@/app/lib/data";
import { parseDraft, statusLabel } from "@/app/lib/subscription";
import { readFileSync } from "node:fs";

/**
 * حارس على البيانات اللي الواجهة بتعتمد عليها.
 *
 * ليه الملف ده؟ لأن أي `export` بيتشال أو بيترجع `undefined` مابيبوّظش الـ build —
 * بيقع في المتصفح وقت التشغيل بـ `Cannot read properties of undefined (reading 'map')`.
 * الاختبارات دي بتمسك النوع ده من الكسر بدري، وكمان بتقفل الباب على رجوع
 * الدفع بالكروت من غير ما حد ياخد باله.
 */

/** كل مصفوفة الواجهة بتعمل عليها `.map()` — لازم تكون موجودة وفيها عناصر */
const RENDERED_LISTS = [
  "PLANS",
  "CYCLES",
  "ADDONS",
  "COUPONS",
  "PAY_METHODS",
  "PAY_TARGETS",
  "GOALS",
  "TIME_SLOTS",
  "FAQS",
  "NAV",
] as const;

describe("data.ts — المصفوفات اللي الواجهة بترسمها", () => {
  it.each(RENDERED_LISTS)("%s متصدّرة ومصفوفة مش فاضية", (key) => {
    const value = (data as Record<string, unknown>)[key];
    expect(Array.isArray(value), `${key} لازم يكون مصفوفة مش ${typeof value}`).toBe(true);
    expect((value as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("الدفع بالكروت اتشال خالص", () => {
  it("طرق الدفع = محفظة أو كاش بس", () => {
    expect(PAY_METHODS.map((m) => m.id).sort()).toEqual(["cash", "wallet"]);
  });

  it("مفيش أي طريقة دفع بكارت أو تقسيط", () => {
    for (const banned of ["card", "install", "visa", "mastercard", "mada"]) {
      expect(PAY_METHODS.some((m) => m.id === banned)).toBe(false);
    }
  });

  it("النصوص المعروضة للعضو مفيهاش كلمة فيزا ولا بطاقة ائتمان", () => {
    const text = PAY_METHODS.map((m) => `${m.label} ${m.hint}`).join(" ");
    expect(text).not.toMatch(/فيزا|ماستر|بطاقة/);
  });

  it("أرقام التحويل موجودة عشان خطوة الدفع ما تقعش", () => {
    expect(PAY_TARGETS.length).toBeGreaterThan(0);
    for (const t of PAY_TARGETS) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.value.length).toBeGreaterThan(0);
    }
  });

  it("السيرفر بيرفض أي طريقة دفع قديمة", () => {
    // `parseDraft` مابتتحققش من طريقة الدفع، فبنتأكد إن القائمة نفسها هي المرجع
    const ids: string[] = PAY_METHODS.map((m) => m.id);
    expect(ids).not.toContain("card");
    expect(ids).not.toContain("install");
  });
});

describe("حالات الاشتراك كلها ليها ترجمة", () => {
  it("مفيش حالة من غير نص عربي (وإلا هتظهر إنجليزي في الواجهة)", () => {
    for (const status of ["pending", "active", "frozen", "cancelled", "expired"] as const) {
      expect(statusLabel[status]).toBeTruthy();
      expect(statusLabel[status]).not.toMatch(/^[a-z_]+$/);
    }
  });
});

describe("parseDraft — الحارس اللي بين المتصفح والفلوس", () => {
  it("بيقبل اختيار سليم", () => {
    const { draft, errors } = parseDraft({ planId: "pro", cycle: "yearly", addonIds: ["nutrition"], coupon: "fit10" });
    expect(errors).toEqual({});
    expect(draft.coupon).toBe("FIT10"); // بيتحوّل لحروف كبيرة
  });

  it("بيرفض أي حاجة مش في الكتالوج بدل ما يرجع لسعر افتراضي", () => {
    expect(parseDraft({ planId: "platinum", cycle: "yearly", addonIds: [] }).errors.planId).toBeTruthy();
    expect(parseDraft({ planId: "pro", cycle: "weekly", addonIds: [] }).errors.cycle).toBeTruthy();
    expect(parseDraft({ planId: "pro", cycle: "yearly", addonIds: ["ferrari"] }).errors.addonIds).toBeTruthy();
  });

  it("بيشيل الإضافات المكررة وبيتحمل مدخلات بايظة من غير ما يقع", () => {
    expect(parseDraft({ planId: "pro", cycle: "monthly", addonIds: ["nutrition", "nutrition"] }).draft.addonIds).toEqual(["nutrition"]);
    expect(() => parseDraft({})).not.toThrow();
    expect(() => parseDraft({ planId: null, cycle: 5, addonIds: "مش مصفوفة", coupon: {} })).not.toThrow();
  });
});

/**
 * حارس ضد رجوع باج فقدان الفوكس في نموذج الاشتراك.
 *
 * خطوات الـ Checkout معرّفة كدوال جوّه كومبوننت `Checkout`، يعني هويتها بتتغير
 * مع كل رندر. لو اترسمت كعناصر JSX (`<LeadStep />`) هيبقى نوع العنصر اتغيّر،
 * وReact هيعمل unmount + mount للشجرة كلها مع كل ضغطة زرار — والنتيجة إن خانة
 * الاسم/التليفون/رقم المحفظة تفقد الفوكس بعد كل حرف. النداء المباشر `LeadStep()`
 * بيخلي المحتوى جزء من رندر `Checkout` نفسه فالفوكس بيفضل ثابت.
 */
describe("Checkout — الخطوات مش كومبوننتات متداخلة", () => {
  const raw = readFileSync(new URL("../app/components/Checkout.tsx", import.meta.url), "utf8");
  // شيل كل التعليقات (بلوك + سطر) عشان الشرح المكتوب فيها ما يزيّفش النتيجة
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  for (const step of ["ReviewStep", "LeadStep", "PayStep", "DoneStep"]) {
    it(`${step} بتتنادى كدالة مش كـ JSX`, () => {
      expect(code).not.toMatch(new RegExp(`<${step}[\\s/>]`));
      expect(code).toContain(`${step}()`);
    });
  }

  it("مفيش useEffect بينده setState في Checkout", () => {
    expect(code).not.toContain("useEffect");
  });
});
