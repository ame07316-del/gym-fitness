import { NextResponse } from "next/server";
import { db, pushCapped, type BookingRecord } from "@/app/lib/server/db";
import { clean, validateBooking } from "@/app/lib/server/validate";

export const dynamic = "force-dynamic";

export type { BookingRecord };

/**
 * التخزين في `app/lib/server/db.ts` (ذاكرة مشتركة بين كل الـ handlers ولوحة الإدارة).
 * في الإنتاج بدّله بقاعدة بيانات حقيقية (مثلاً جدول bookings في Laravel/MySQL)
 * عن طريق تغيير طبقة الـ db فقط — الواجهة مش محتاجة تعديل.
 *
 * التحقق (`validateBooking`) في `app/lib/server/validate.ts` عشان يتشارك مع /api/subscribe
 * والاختبارات — ملفات الـ route لازم تصدّر HTTP handlers بس.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const { name, phone, goal, errors } = validateBooking(body);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "بيانات ناقصة", fields: errors }, { status: 422 });
  }

  const record: BookingRecord = {
    id: clean(body.id, 24) || `BK-${Date.now().toString(36).toUpperCase()}`,
    name,
    phone,
    goal,
    slot: clean(body.slot, 40) || "أي وقت",
    plan: clean(body.plan, 40) || "استعلام",
    status: "confirmed",
    createdAt: typeof body.createdAt === "number" ? body.createdAt : Date.now(),
  };

  pushCapped(db.bookings, record);

  return NextResponse.json(
    { ok: true, booking: record, queue: db.bookings.length, message: `تم استلام طلب ${name} وهنتواصل معاك على ${phone}` },
    { status: 201 },
  );
}

export async function GET() {
  const store = db.bookings;
  return NextResponse.json({
    total: store.length,
    pending: store.filter((s) => s.status !== "confirmed").length,
    items: store.slice(0, 25),
  });
}
