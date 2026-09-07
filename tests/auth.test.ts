import { describe, expect, it } from "vitest";
import { can, canManageRole, isScopedToOwn, ROLE_PERMISSIONS, ROLES } from "@/app/lib/auth/roles";
import { hashPassword, passwordProblem, verifyPassword } from "@/app/lib/auth/password";

/**
 * مصفوفة الصلاحيات + تشفير كلمات السر.
 * أي تعديل في `ROLE_PERMISSIONS` من غير قصد بيكسر الاختبارات دي.
 */

describe("الأدوار والصلاحيات", () => {
  it("المدير العام بس هو اللي بيمسح اشتراك نهائي أو بيدير المستخدمين", () => {
    expect(can("owner", "subscriptions:delete")).toBe(true);
    expect(can("owner", "users:manage")).toBe(true);
    for (const role of ROLES.filter((r) => r !== "owner")) {
      expect(can(role, "subscriptions:delete")).toBe(false);
      expect(can(role, "users:manage")).toBe(false);
    }
  });

  it("مدير الفرع بيلغي ويجمّد بس ما بيمسحش نهائي", () => {
    expect(can("admin", "subscriptions:cancel")).toBe(true);
    expect(can("admin", "subscriptions:update")).toBe(true);
    expect(can("admin", "revenue:read")).toBe(true);
    expect(can("admin", "subscriptions:delete")).toBe(false);
  });

  it("الكوتش بيشوف بتوعه بس ومش بيشوف فلوس ولا بيلغي", () => {
    expect(can("coach", "subscriptions:read:own")).toBe(true);
    expect(can("coach", "subscriptions:read")).toBe(false);
    expect(can("coach", "subscriptions:cancel")).toBe(false);
    expect(can("coach", "revenue:read")).toBe(false);
    expect(isScopedToOwn("coach")).toBe(true);
    expect(isScopedToOwn("admin")).toBe(false);
  });

  it("الاستقبال بيشوف الاشتراكات من غير أرقام مالية ومن غير إلغاء", () => {
    expect(can("reception", "subscriptions:read")).toBe(true);
    expect(can("reception", "revenue:read")).toBe(false);
    expect(can("reception", "subscriptions:cancel")).toBe(false);
    expect(can("reception", "bookings:create")).toBe(true);
  });

  it("مفيش دور بيتخطى صلاحياته المعرّفة", () => {
    for (const role of ROLES) {
      expect(new Set(ROLE_PERMISSIONS[role]).size).toBe(ROLE_PERMISSIONS[role].length);
    }
    // مدير الفرع ما يقدرش يلمس حساب مدير عام
    expect(canManageRole("admin", "owner")).toBe(false);
    expect(canManageRole("owner", "owner")).toBe(true);
    expect(canManageRole("coach", "coach")).toBe(false);
  });
});

describe("كلمات السر — scrypt", () => {
  it("الهاش مالوش شكل ثابت، والتحقق بيمشي مع الكلمة الصح بس", async () => {
    const hash = await hashPassword("Fitzone#Strong1");
    const again = await hashPassword("Fitzone#Strong1");
    expect(hash).not.toBe(again); // ملح مختلف كل مرة
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("Fitzone#Strong1");

    expect(await verifyPassword("Fitzone#Strong1", hash)).toBe(true);
    expect(await verifyPassword("fitzone#strong1", hash)).toBe(false);
    expect(await verifyPassword("Fitzone#Strong1", null)).toBe(false);
    expect(await verifyPassword("Fitzone#Strong1", "مش-هاش")).toBe(false);
  });

  it("سياسة كلمة السر بترفض القصيرة والمتوقّعة", () => {
    expect(passwordProblem("123")).toBeTruthy();
    expect(passwordProblem("password123")).toBeTruthy();
    expect(passwordProblem("abcdefghijkl")).toBeTruthy(); // من غير رقم
    expect(passwordProblem("12345678901")).toBeTruthy(); // من غير حروف
    expect(passwordProblem("Sahel#Gym2026")).toBeNull();
    expect(passwordProblem("كلمهسر٢٠٢٦قوية9")).toBeNull();
  });
});
