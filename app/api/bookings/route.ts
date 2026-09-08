import { NextResponse } from "next/server";
import { getRepo, type BookingRecord } from "@/app/lib/server/db";
import { clean, validateBooking } from "@/app/lib/server/validate";

export const dynamic = "force-dynamic";

export type { BookingRecord };

/**
 * التخزين في `app/lib/server/db.ts` (الـ seam): جدول `bookings` في Postgres/Neon
 * لما `DATABASE_URL` موجود، وإلا مخزن الذاكرة المشترك — نفس الدوال في الحالتين
 * فالهاندلر ده مبيعرفش أصلًا إيه الشغال تحته.
 *
 * التحقق (`validateBooking`) في `app/lib/server/validate.ts` عشان يتشارك مع /api/subscribe
 * والاختبارات — ملفات الـ route لازم تصدّر HTTP handlers بس.
 */
/** كود حجز فريد لو العميل مبعتش واحد — الوقت + عشوائي (عشان طلبين في نفس الملي ثانية) */
const newBookingId = () => `BK-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

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
    id: clean(body.id, 24) || newBookingId(),
    name,
    phone,
    goal,
    slot: clean(body.slot, 40) || "أي وقت",
    plan: clean(body.plan, 40) || "استعلام",
    status: "confirmed",
    createdAt: typeof body.createdAt === "number" ? body.createdAt : Date.now(),
  };

  const repo = await getRepo();
  const saved = await repo.addBooking(record);
  const queue = await repo.countBookings();

  return NextResponse.json(
    { ok: true, booking: saved, queue, message: `تم استلام طلب ${name} وهنتواصل معاك على ${phone}` },
    { status: 201 },
  );
}

export async function GET() {
  const store = await (await getRepo()).listBookings();
  return NextResponse.json({
    total: store.length,
    pending: store.filter((s) => s.status !== "confirmed").length,
    items: store.slice(0, 25),
  });
}
