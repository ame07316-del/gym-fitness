import { EG_PHONE_RE } from "@/app/lib/utils";

/** قص وتنظيف نص جاي من الطلب */
export const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * التحقق المشترك من بيانات الشخص (اسم + موبايل مصري) — بيستخدمه
 * `/api/bookings` و `/api/subscribe`، ونفس القواعد مكتوبة في docs/BACKEND-CONTRACT.md.
 */
export function validateBooking(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const name = clean(body.name, 60);
  const phone = clean(body.phone, 20).replace(/[\s-]/g, "");

  if (name.length < 3) errors.name = "من فضلك اكتب اسمك الكامل (3 أحرف على الأقل)";
  if (!EG_PHONE_RE.test(phone)) errors.phone = "رقم موبايل مصري غير صحيح — مثال: 01012345678";

  return { name, phone, goal: clean(body.goal, 60) || "غير محدد", errors };
}
