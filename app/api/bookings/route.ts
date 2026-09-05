import { EG_PHONE_RE } from "@/app/lib/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

/**
 * مخزن مؤقت في الذاكرة للعرض التوضيحي.
 * في الإنتاج بدّله بقاعدة بيانات حقيقية (مثلاً جدول bookings في Laravel/MySQL)
 * عن طريق تغيير هذا الملف فقط — الواجهة مش محتاجة تعديل.
 */
const store: BookingRecord[] = [];
const MAX = 200;

const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateBooking(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const name = clean(body.name, 60);
  const phone = clean(body.phone, 20).replace(/[\s-]/g, "");

  if (name.length < 3) errors.name = "من فضلك اكتب اسمك الكامل (3 أحرف على الأقل)";
  if (!EG_PHONE_RE.test(phone)) errors.phone = "رقم موبايل مصري غير صحيح — مثال: 01012345678";

  return { name, phone, goal: clean(body.goal, 60) || "غير محدد", errors };
}

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

  store.unshift(record);
  if (store.length > MAX) store.length = MAX;

  return NextResponse.json(
    { ok: true, booking: record, queue: store.length, message: `تم استلام طلب ${name} وهنتواصل معاك على ${phone}` },
    { status: 201 },
  );
}

export async function GET() {
  return NextResponse.json({
    total: store.length,
    pending: store.filter((s) => s.status !== "confirmed").length,
    items: store.slice(0, 25),
  });
}
