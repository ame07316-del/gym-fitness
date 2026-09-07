import { validateBooking } from "../bookings/route";
import { authorize, scopeCoachId } from "@/app/lib/auth/guard";
import { can } from "@/app/lib/auth/roles";
import { audit } from "@/app/lib/db/audit";
import { hitRateLimit } from "@/app/lib/db/rate-limit";
import { createSubscription, expireOverdue, listSubscriptions, subscriptionStats } from "@/app/lib/db/subscriptions";
import { cleanText, clientIp, errorJson, json, readJson, toInt } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

const arr = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((s) => s.slice(0, 24)).slice(0, 12) : [];

const ORDER_ID_RE = /^[A-Z0-9-]{4,24}$/;
const MAX_TOTAL = 1_000_000; // سقف منطقي — أي رقم أكبر ده تلاعب أو غلط

/** تفعيل اشتراك بعد نجاح الدفع (عام — من التشيك أوت) */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = hitRateLimit(`subscribe:${ip}`, { limit: 20, windowMs: 10 * 60_000, blockMs: 10 * 60_000 });
  if (!limit.ok) return errorJson("طلبات كتير من نفس الجهاز — استنى شوية", 429, { retryAfter: limit.retryAfterSeconds });

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const member = (body.member ?? {}) as Record<string, unknown>;
  const { name, phone, goal, errors } = validateBooking(member);
  if (Object.keys(errors).length) return json({ error: "بيانات العضو غير مكتملة", fields: errors }, { status: 422 });

  const total = toInt(body.total);
  if (total <= 0 || total > MAX_TOTAL) return errorJson("قيمة الاشتراك غير صحيحة", 422);

  const rawOrderId = cleanText(body.orderId, 24).toUpperCase();
  const orderId = ORDER_ID_RE.test(rawOrderId) ? rawOrderId : `FZ-${Date.now().toString(36).toUpperCase()}`;
  const months = Math.max(1, Math.min(24, toInt(body.months, 1) || 1));

  const sub = createSubscription({
    orderId,
    memberName: name,
    memberPhone: phone,
    memberGoal: goal,
    planName: cleanText(body.planName, 40) || "برو",
    cycle: cleanText(body.cycle, 20) || "monthly",
    months,
    addonIds: arr(body.addonIds),
    coupon: cleanText(body.coupon, 20).toUpperCase() || null,
    total,
    perMonth: toInt(body.perMonth) || total,
    payment: cleanText(body.payment, 20) || "card",
    paymentRef: cleanText(body.paymentRef, 64) || null,
    // مفيش أي رقم كارت بيتخزن — الشعار وآخر 4 أرقام بس
    cardBrand: cleanText(body.cardBrand, 20) || null,
    cardLast4: cleanText(body.cardLast4, 4).replace(/\D/g, "") || null,
    endsAt: toInt(body.endsAt) || Date.now() + months * 30 * 86_400_000,
  });

  audit({ action: "subscription.created", entity: "subscription", entityId: sub.orderId, meta: { plan: sub.planName, months: sub.months }, ip });

  const record: SubscribeRecord = {
    orderId: sub.orderId,
    planName: sub.planName,
    cycle: sub.cycle,
    months: sub.months,
    addonIds: sub.addonIds,
    coupon: sub.coupon,
    total: sub.total,
    perMonth: sub.perMonth,
    member: { name: sub.member.name, phone: sub.member.phone, goal: sub.member.goal ?? "" },
    payment: sub.payment,
    status: sub.status,
    createdAt: sub.createdAt,
    endsAt: sub.endsAt,
  };

  return json(
    { ok: true, order: record, invoice: `INV-${sub.orderId}`, message: `تم تفعيل عضوية ${sub.member.name} — ${sub.planName}` },
    { status: 201 },
  );
}

/**
 * ملخّص الاشتراكات — **محمي**.
 * الإيراد بيظهر بس للأدوار اللي معاها `revenue:read`، والكوتش بيشوف أعضاءه هو بس.
 */
export async function GET(request: Request) {
  const guard = await authorize(request);
  if (!guard.ok) return guard.response;

  const role = guard.ctx.user.role;
  if (!can(role, "subscriptions:read") && !can(role, "subscriptions:read:own")) {
    return errorJson("الصلاحية دي مش متاحة لدورك", 403);
  }

  expireOverdue();
  const scoped = scopeCoachId(guard.ctx);
  const stats = subscriptionStats(scoped);
  const { items } = listSubscriptions({ coachId: scoped, limit: 25 });

  return json({
    total: stats.total,
    revenue: can(role, "revenue:read") ? stats.revenue : null,
    byPlan: Object.fromEntries(stats.byPlan.map((p) => [p.plan, p.count])),
    items,
  });
}
