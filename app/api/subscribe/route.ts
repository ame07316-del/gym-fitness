import { validateBooking } from "../bookings/route";
import { authorize, scopeCoachId } from "@/app/lib/auth/guard";
import { can } from "@/app/lib/auth/roles";
import { PAY_METHODS } from "@/app/lib/data";
import { audit } from "@/app/lib/db/audit";
import { hitRateLimit } from "@/app/lib/db/rate-limit";
import { createSubscription, expireOverdue, listSubscriptions, subscriptionStats } from "@/app/lib/db/subscriptions";
import { cleanText, clientIp, errorJson, json, readJson } from "@/app/lib/http";
import { addMonths, parseDraft, quoteOf } from "@/app/lib/subscription";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type SubscribeRecord = {
  orderId: string;
  planId: string | null;
  planName: string;
  cycle: string;
  months: number;
  addonIds: string[];
  coupon: string | null;
  total: number;
  perMonth: number;
  member: { name: string; phone: string; goal: string };
  payment: string;
  paymentRef: string | null;
  status: string;
  createdAt: number;
  endsAt: number;
};

/** رقم طلب بيتولّد على السيرفر — العميل مش بيختار رقمه عشان ما يدهسش على طلب تاني */
const newOrderId = () => `FZ-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

const isPayMethod = (v: string): v is (typeof PAY_METHODS)[number]["id"] => PAY_METHODS.some((m) => m.id === v);

/**
 * تسجيل اشتراك جديد من التشيك أوت (عام).
 *
 * الأمان: كل الفلوس (الإجمالي/الشهري/المدة/تاريخ الانتهاء) **بتتحسب هنا** من
 * الباقة والمدة والإضافات والكوبون. أي `total` أو `endsAt` جاي في الطلب بيتتجاهل.
 * الاشتراك بيتسجّل `pending` لحد ما الإدارة تأكد استلام الفلوس من لوحة التحكم —
 * مفيش دفع بالكروت في الموقع أصلًا.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = hitRateLimit(`subscribe:${ip}`, { limit: 20, windowMs: 10 * 60_000, blockMs: 10 * 60_000 });
  if (!limit.ok) return errorJson("طلبات كتير من نفس الجهاز — استنى شوية", 429, { retryAfter: limit.retryAfterSeconds });

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const member = (body.member ?? {}) as Record<string, unknown>;
  const { name, phone, goal, errors } = validateBooking(member);

  const { draft, errors: draftErrors } = parseDraft(body);
  Object.assign(errors, draftErrors);

  const payment = cleanText(body.payment, 20);
  if (!isPayMethod(payment)) errors.payment = "اختار طريقة دفع صحيحة";

  if (Object.keys(errors).length) return json({ error: "بيانات الاشتراك غير مكتملة", fields: errors }, { status: 422 });

  // كوبون غلط = رفض صريح، مش خصم بصمت ولا سعر مختلف عن اللي العضو شافه
  const quote = quoteOf(draft);
  if (quote.couponError) return json({ error: quote.couponError, fields: { coupon: quote.couponError } }, { status: 422 });

  const createdAt = Date.now();
  const sub = createSubscription({
    orderId: newOrderId(),
    memberName: name,
    memberPhone: phone,
    memberGoal: goal,
    planId: draft.planId,
    planName: quote.planName,
    cycle: draft.cycle,
    months: quote.months,
    addonIds: draft.addonIds,
    coupon: quote.coupon?.code ?? null,
    total: quote.total,
    perMonth: quote.perMonth,
    payment,
    paymentRef: cleanText(body.paymentRef, 64) || null,
    status: "pending",
    endsAt: addMonths(createdAt, quote.months),
  });

  audit({
    action: "subscription.created",
    entity: "subscription",
    entityId: sub.orderId,
    meta: { plan: sub.planName, months: sub.months, total: sub.total, payment: sub.payment },
    ip,
  });

  const record: SubscribeRecord = {
    orderId: sub.orderId,
    planId: sub.planId,
    planName: sub.planName,
    cycle: sub.cycle,
    months: sub.months,
    addonIds: sub.addonIds,
    coupon: sub.coupon,
    total: sub.total,
    perMonth: sub.perMonth,
    member: { name: sub.member.name, phone: sub.member.phone, goal: sub.member.goal ?? "" },
    payment: sub.payment,
    paymentRef: sub.paymentRef,
    status: sub.status,
    createdAt: sub.createdAt,
    endsAt: sub.endsAt,
  };

  return json(
    {
      ok: true,
      order: record,
      invoice: `INV-${sub.orderId}`,
      message:
        payment === "cash"
          ? `تم حجز عضوية ${sub.member.name} — ${sub.planName}. ادفع في الفرع خلال 48 ساعة عشان تتفعّل.`
          : `تم تسجيل طلب عضوية ${sub.member.name} — ${sub.planName}. الاشتراك هيتفعّل بعد تأكيد التحويل.`,
    },
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
