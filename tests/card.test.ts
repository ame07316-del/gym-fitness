import { describe, expect, it } from "vitest";
import { detectBrand, expValid, luhnValid, validateCard } from "@/app/lib/payment";

/** اختبارات طبقة التحقق من الكروت — السلوك اللي بيخلي الدفع التجريبي «حقيقي» */

describe("luhnValid", () => {
  it("بيقبل أرقام اختبار صحيحة (بمسافات وشورت)", () => {
    expect(luhnValid("4242 4242 4242 4242")).toBe(true);
    expect(luhnValid("5555555555554444")).toBe(true);
    expect(luhnValid("3782 822463 10005")).toBe(true); // Amex 15 digit
  });

  it("بيرفض آخر رقم غلط أو طول غير قانوني", () => {
    expect(luhnValid("4242 4242 4242 4243")).toBe(false);
    expect(luhnValid("424242424242")).toBe(false); // 12 رقم
    expect(luhnValid("")).toBe(false);
    expect(luhnValid("abcd efgh")).toBe(false);
  });
});

describe("detectBrand", () => {
  it.each([
    ["4242424242424242", "visa"],
    ["5555555555554444", "mastercard"],
    ["378282246310005", "amex"],
    ["5080123412341234", "mada"],
    ["9201 1234 1234 1234", "mada"],
    ["5852 1234 1234 1234", "mada"],
    ["2221 0000 0000 0009", "mastercard"],
    ["", "unknown"],
  ] as const)("%s → %s", (number, brand) => {
    expect(detectBrand(number)).toBe(brand);
  });
});

describe("expValid (MM/YY)", () => {
  it("بيقبل تاريخ في المستقبل", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const mm = String(future.getMonth() + 1).padStart(2, "0");
    const yy = String(future.getFullYear() % 100).padStart(2, "0");
    expect(expValid(`${mm}/${yy}`)).toBe(true);
  });

  it("بيرفض منتهي أو شهر مش موجود أو فورم غلط", () => {
    expect(expValid("01/20")).toBe(false);
    expect(expValid("13/30")).toBe(false);
    expect(expValid("00/30")).toBe(false);
    expect(expValid("1234")).toBe(false);
  });
});

describe("validateCard — الأخطاء لكل حقل لوحده", () => {
  const ok = { number: "4242 4242 4242 4242", exp: "12/30", cvv: "123", holder: "Mohamed Adel" };

  it("كل حاجة صح → valid + brand + آخر 4 أرقام", () => {
    const r = validateCard(ok);
    expect(r.valid).toBe(true);
    expect(r.errors.number).toBeUndefined();
    expect(r.brand).toBe("visa");
    expect(r.masked).toContain("4242");
    expect(r.masked).not.toContain("4242 4242"); // مش بيرجع الرقم كامل
  });

  it("CVV قصير = خطأ في حقل CVV بس", () => {
    const r = validateCard({ ...ok, cvv: "12" });
    expect(r.valid).toBe(false);
    expect(r.errors.cvv).toBeTruthy();
    expect(r.errors.number).toBeUndefined();
    expect(r.errors.exp).toBeUndefined();
  });

  it("Amex بيقبل 15 رقم و CVV من 3 أو 4 أرقام، ويرفض 16 رقم", () => {
    expect(validateCard({ ...ok, number: "378282246310005", cvv: "1234" }).valid).toBe(true);
    expect(validateCard({ ...ok, number: "3782 8224 6310 005", cvv: "123" }).valid).toBe(true);
    const r = validateCard({ ...ok, number: "3782822463100050" });
    expect(r.errors.number).toContain("15");
  });

  it("رقم مش Luhn → خطأ تحت الرقم، والتاريخ الغلط لوحده", () => {
    expect(validateCard({ ...ok, number: "4242 4242 4242 4241" }).errors.number).toBeTruthy();
    const r = validateCard({ ...ok, exp: "01/21" });
    expect(r.errors.exp).toBeTruthy();
    expect(r.errors.number).toBeUndefined();
  });

  it("اسم فارغ = خطأ في اسم حامل الكارت", () => {
    expect(validateCard({ ...ok, holder: "   " }).errors.holder).toBeTruthy();
  });
});
