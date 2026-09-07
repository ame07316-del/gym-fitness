import { EG_PHONE_RE } from "@/app/lib/utils";
import { authorize, scopeCoachId } from "@/app/lib/auth/guard";
import { can } from "@/app/lib/auth/roles";
import { audit } from "@/app/lib/db/audit";
import { createBooking, listBookings } from "@/app/lib/db/bookings";
import { hitRateLimit } from "@/app/lib/db/rate-limit";
import { cleanPhone, cleanText, clientIp, errorJson, json, readJson } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type BookingRecord = {
  id: string;
  name: string;
  phone: string;
  goal: string;
  slot: string;
  plan: string;
  status: string;
  createdAt: number;
};

/** التحقق المشترك بين الحجز والاشتراك — نفس الرسائل بتظهر تحت الحقل في الفورم */
export function validateBooking(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const name = cleanText(body.name, 60);
  const phone = cleanPhone(body.phone);

  if (name.length < 3) errors.name = "من فضلك اكتب اسمك الكامل (3 أحرف على الأقل)";
  if (!EG_PHONE_RE.test(phone)) errors.phone = "رقم موبايل مصري غير صحيح — مثال: 01012345678";

  return { name, phone, goal: cleanText(body.goal, 60) || "غير محدد", errors };
}

/** حجز جلسة (عام — من فورم الموقع) */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = hitRateLimit(`bookings:${ip}`, { limit: 20, windowMs: 10 * 60_000, blockMs: 10 * 60_000 });
  if (!limit.ok) {
    return errorJson("طلبات كتير من نفس الجهاز — استنى شوية وجرّب تاني", 429, { retryAfter: limit.retryAfterSeconds });
  }

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const { name, phone, goal, errors } = validateBooking(body);
  if (Object.keys(errors).length) return json({ error: "بيانات ناقصة", fields: errors }, { status: 422 });

  // الـ id بيتولّد على السيرفر دايمًا — العميل مايتحكمش في مفاتيح الجدول
  const id = `BK-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
  const booking = createBooking({
    id,
    name,
    phone,
    goal,
    slot: cleanText(body.slot, 40) || "أي وقت",
    plan: cleanText(body.plan, 40) || "استعلام",
    status: "confirmed",
  });

  audit({ action: "booking.created", entity: "booking", entityId: booking.id, meta: { slot: booking.slot, plan: booking.plan }, ip });

  const record: BookingRecord = {
    id: booking.id,
    name: booking.name,
    phone: booking.phone,
    goal: booking.goal,
    slot: booking.slot,
    plan: booking.plan,
    status: booking.status,
    createdAt: booking.createdAt,
  };

  return json(
    { ok: true, booking: record, message: `تم استلام طلب ${name} وهنتواصل معاك على ${phone}` },
    { status: 201 },
  );
}

/**
 * قائمة الحجوزات — **محمية**.
 * قبل كده كانت مفتوحة للعالم وبترجع أسماء وتليفونات العملاء؛ دلوقتي محتاجة جلسة
 * ومعاها صلاحية، والكوتش بيشوف حجوزاته هو بس.
 */
export async function GET(request: Request) {
  const guard = await authorize(request);
  if (!guard.ok) return guard.response;

  const role = guard.ctx.user.role;
  if (!can(role, "bookings:read") && !can(role, "bookings:read:own")) {
    return errorJson("الصلاحية دي مش متاحة لدورك", 403);
  }

  const { items, total, pending } = listBookings({ coachId: scopeCoachId(guard.ctx), limit: 25 });
  return json({ total, pending, items });
}
