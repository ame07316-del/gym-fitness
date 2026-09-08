import { NextResponse } from "next/server";
import { validateBooking } from "@/app/lib/server/validate";
import { db, pushCapped, type SubscribeRecord } from "@/app/lib/server/db";

export const dynamic = "force-dynamic";

export type { SubscribeRecord };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : []);
const str = (v: unknown, max: number, fallback = "") => (typeof v === "string" ? v.slice(0, max) : fallback);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const member = (body.member ?? {}) as Record<string, unknown>;
  const { name, phone, errors } = validateBooking(member);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "بيانات العضو غير مكتملة", fields: errors }, { status: 422 });
  }

  const total = num(body.total);
  if (total <= 0) return NextResponse.json({ error: "قيمة الاشتراك غير صحيحة" }, { status: 422 });

  const rec: SubscribeRecord = {
    orderId: str(body.orderId, 24) || `FZ-${Date.now().toString(36).toUpperCase()}`,
    planId: str(body.planId, 12, "pro"),
    planName: str(body.planName, 40, "برو"),
    cycle: str(body.cycle, 20, "monthly"),
    months: Math.max(1, Math.min(24, Math.round(num(body.months) || 1))),
    addonIds: arr(body.addonIds),
    coupon: typeof body.coupon === "string" && body.coupon ? body.coupon.slice(0, 20) : null,
    total: Math.round(total),
    perMonth: Math.round(num(body.perMonth) || total),
    member: { name, phone, goal: str(member.goal, 60) },
    payment: str(body.payment, 40, "card"),
    status: "active",
    autoRenew: typeof body.autoRenew === "boolean" ? body.autoRenew : true,
    createdAt: Date.now(),
    endsAt: num(body.endsAt) || Date.now(),
  };

  pushCapped(db.orders, rec);

  return NextResponse.json(
    { ok: true, order: rec, invoice: `INV-${rec.orderId}`, message: `تم تفعيل عضوية ${rec.member.name} — ${rec.planName}` },
    { status: 201 },
  );
}

export async function GET() {
  const orders = db.orders;
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  return NextResponse.json({
    total: orders.length,
    revenue,
    byPlan: orders.reduce<Record<string, number>>((m, o) => ({ ...m, [o.planName]: (m[o.planName] ?? 0) + 1 }), {}),
    items: orders.slice(0, 25),
  });
}
