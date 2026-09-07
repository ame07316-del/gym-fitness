import { isAdminRequest, NO_STORE_HEADERS } from "@/app/lib/api-security";
import { readJsonObject } from "@/app/lib/request";
import { NextResponse } from "next/server";
import { validateBooking } from "../bookings/route";

export const dynamic = "force-dynamic";

export type SubscribeRecord = {
  orderId: string;
  planName: string;
  cycle: string;
  months: number;
  addonIds: string[];
  coupon: string | null;
  total: number;
  perMonth: number;
  member: { name: string; phone: string; goal: string };
  payment: string;
  status: string;
  createdAt: number;
  endsAt: number;
};

const orders: SubscribeRecord[] = [];
const MAX = 200;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : []);

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.body;

  const member = (body.member ?? {}) as Record<string, unknown>;
  const { name, phone, errors } = validateBooking(member);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "بيانات العضو غير مكتملة", fields: errors }, { status: 422 });
  }

  const total = num(body.total);
  if (total <= 0) return NextResponse.json({ error: "قيمة الاشتراك غير صحيحة" }, { status: 422 });

  const rec: SubscribeRecord = {
    orderId: typeof body.orderId === "string" ? body.orderId.slice(0, 24) : `FZ-${Date.now().toString(36).toUpperCase()}`,
    planName: typeof body.planName === "string" ? body.planName.slice(0, 40) : "برو",
    cycle: typeof body.cycle === "string" ? body.cycle.slice(0, 20) : "monthly",
    months: Math.max(1, Math.min(24, Math.round(num(body.months) || 1))),
    addonIds: arr(body.addonIds),
    coupon: typeof body.coupon === "string" && body.coupon ? body.coupon.slice(0, 20) : null,
    total: Math.round(total),
    perMonth: Math.round(num(body.perMonth) || total),
    member: { name, phone, goal: typeof member.goal === "string" ? member.goal.slice(0, 60) : "" },
    payment: typeof body.payment === "string" ? body.payment.slice(0, 40) : "card",
    status: "active",
    createdAt: Date.now(),
    endsAt: num(body.endsAt) || Date.now(),
  };

  orders.unshift(rec);
  if (orders.length > MAX) orders.length = MAX;

  return NextResponse.json(
    { ok: true, order: rec, invoice: `INV-${rec.orderId}`, message: `تم تفعيل عضوية ${rec.member.name} — ${rec.planName}` },
    { status: 201 },
  );
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "غير مصرح — يلزم رمز لوحة الإدارة" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  return NextResponse.json(
    {
      total: orders.length,
      revenue,
      byPlan: orders.reduce<Record<string, number>>((m, o) => ({ ...m, [o.planName]: (m[o.planName] ?? 0) + 1 }), {}),
      items: orders.slice(0, 25),
    },
    { headers: NO_STORE_HEADERS },
  );
}
