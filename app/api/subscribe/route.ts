import { isAdminRequest, NO_STORE_HEADERS } from "@/app/lib/api-security";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { ADDONS, CYCLES, PLANS, type CycleId, type PlanId } from "@/app/lib/data";
import { readJsonObject } from "@/app/lib/request";
import { addMonths, quoteOf } from "@/app/lib/subscription";
import { NextResponse } from "next/server";
import { validateBooking } from "../bookings/route";

export const dynamic = "force-dynamic";

export type SubscribeRecord = {
  orderId: string;
  planId: PlanId;
  planName: string;
  cycle: CycleId;
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
const PAYMENT_METHODS = new Set(["card", "wallet", "install", "cash"]);

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : []);
const isPlanId = (v: unknown): v is PlanId => typeof v === "string" && PLANS.some((p) => p.id === v);
const isCycleId = (v: unknown): v is CycleId => typeof v === "string" && CYCLES.some((c) => c.id === v);

const badFields = (fields: Record<string, string>) =>
  NextResponse.json({ error: "بيانات الاشتراك غير صحيحة", fields }, { status: 422 });

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "subscribe", 20);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "محاولات كثيرة — جرّب مرة أخرى بعد قليل" },
      { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(rate.retryAfter) } },
    );
  }

  const parsed = await readJsonObject(request);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.body;

  const member = (body.member ?? {}) as Record<string, unknown>;
  const { name, phone, errors } = validateBooking(member);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "بيانات العضو غير مكتملة", fields: errors }, { status: 422 });
  }

  const fields: Record<string, string> = {};
  if (!isPlanId(body.planId)) fields.planId = "الباقة غير صحيحة";
  if (!isCycleId(body.cycle)) fields.cycle = "مدة الاشتراك غير صحيحة";

  const rawAddonIds = body.addonIds === undefined ? [] : body.addonIds;
  if (!Array.isArray(rawAddonIds) || rawAddonIds.length > 12 || rawAddonIds.some((id) => typeof id !== "string")) {
    fields.addonIds = "الإضافات غير صحيحة";
  }
  const addonIds = arr(rawAddonIds);
  if (addonIds.some((id) => !ADDONS.some((addon) => addon.id === id))) {
    fields.addonIds = "فيه إضافة غير موجودة";
  }

  const payment = clean(body.payment, 20) || "card";
  if (!PAYMENT_METHODS.has(payment)) fields.payment = "طريقة الدفع غير صحيحة";

  if (Object.keys(fields).length) return badFields(fields);

  const planId = body.planId as PlanId;
  const cycle = body.cycle as CycleId;
  const couponInput = typeof body.coupon === "string" ? body.coupon.trim().toUpperCase() : null;
  const quote = quoteOf({ planId, cycle, addonIds, coupon: couponInput || null });

  if (couponInput && (quote.couponError || !quote.coupon)) {
    fields.coupon = quote.couponError ?? "كود الخصم غير صحيح";
  }

  const clientTotal = num(body.total);
  if (typeof body.total !== "number" || !Number.isFinite(body.total) || Math.round(clientTotal * 100) !== Math.round(quote.total * 100)) {
    fields.total = `الإجمالي الصحيح هو ${Math.round(quote.total)} ج.م`;
  }
  if (Object.keys(fields).length) return badFields(fields);

  const suppliedId = clean(body.orderId, 24).replace(/[^a-zA-Z0-9_-]/g, "");
  const orderId = suppliedId || `FZ-${Date.now().toString(36).toUpperCase()}`;
  const existing = orders.find((order) => order.orderId === orderId);
  if (existing) {
    return NextResponse.json(
      { ok: true, order: existing, invoice: `INV-${existing.orderId}`, message: `الطلب ${existing.orderId} متسجل بالفعل` },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  const createdAt = Date.now();
  const rec: SubscribeRecord = {
    orderId,
    planId,
    planName: quote.planName,
    cycle,
    months: quote.months,
    addonIds,
    coupon: quote.coupon?.code ?? null,
    total: quote.total,
    perMonth: quote.perMonth,
    member: { name, phone, goal: clean(member.goal, 60) },
    payment,
    status: "active",
    createdAt,
    endsAt: addMonths(createdAt, quote.months),
  };

  orders.unshift(rec);
  if (orders.length > MAX) orders.length = MAX;

  return NextResponse.json(
    { ok: true, order: rec, invoice: `INV-${rec.orderId}`, message: `تم تفعيل عضوية ${rec.member.name} — ${rec.planName}` },
    { status: 201, headers: NO_STORE_HEADERS },
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
