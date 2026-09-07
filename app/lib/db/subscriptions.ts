/** استعلامات الاشتراكات — كل SQL خاص بالاشتراكات هنا وبس. */
import { getDb, now } from ".";

export type SubStatus = "active" | "frozen" | "cancelled" | "expired";

export type SubscriptionRow = {
  order_id: string;
  member_name: string;
  member_phone: string;
  member_goal: string | null;
  plan_name: string;
  cycle: string;
  months: number;
  addon_ids: string;
  coupon: string | null;
  total: number;
  per_month: number;
  payment_method: string;
  payment_ref: string | null;
  card_brand: string | null;
  card_last4: string | null;
  coach_id: string | null;
  status: SubStatus;
  created_at: number;
  updated_at: number;
  ends_at: number;
  cancelled_at: number | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
};

export type Subscription = {
  orderId: string;
  member: { name: string; phone: string; goal: string | null };
  planName: string;
  cycle: string;
  months: number;
  addonIds: string[];
  coupon: string | null;
  total: number;
  perMonth: number;
  payment: string;
  paymentRef: string | null;
  card: { brand: string | null; last4: string | null };
  coachId: string | null;
  coachName: string | null;
  status: SubStatus;
  createdAt: number;
  updatedAt: number;
  endsAt: number;
  cancelledAt: number | null;
  cancelReason: string | null;
};

type JoinedRow = SubscriptionRow & { coach_name: string | null };

const parseAddons = (raw: string): string[] => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export const toSubscription = (r: JoinedRow): Subscription => ({
  orderId: r.order_id,
  member: { name: r.member_name, phone: r.member_phone, goal: r.member_goal },
  planName: r.plan_name,
  cycle: r.cycle,
  months: r.months,
  addonIds: parseAddons(r.addon_ids),
  coupon: r.coupon,
  total: r.total,
  perMonth: r.per_month,
  payment: r.payment_method,
  paymentRef: r.payment_ref,
  card: { brand: r.card_brand, last4: r.card_last4 },
  coachId: r.coach_id,
  coachName: r.coach_name ?? null,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  endsAt: r.ends_at,
  cancelledAt: r.cancelled_at,
  cancelReason: r.cancel_reason,
});

/** بنخفي التليفون للأدوار اللي مش مفروض تشوف بيانات تواصل كاملة */
export const maskPhone = (phone: string) => (phone.length < 5 ? "••••" : `${phone.slice(0, 3)}•••••${phone.slice(-2)}`);

const SELECT = `SELECT s.*, u.name AS coach_name FROM subscriptions s LEFT JOIN users u ON u.id = s.coach_id`;

export function getSubscription(orderId: string): Subscription | null {
  const row = getDb().prepare(`${SELECT} WHERE s.order_id = ?`).get(orderId) as JoinedRow | undefined;
  return row ? toSubscription(row) : null;
}

export function listSubscriptions(opts: {
  coachId?: string | null; // لو متبعت: الاشتراكات المسندة للكوتش ده بس
  status?: SubStatus | "all";
  search?: string;
  limit?: number;
  offset?: number;
} = {}): { items: Subscription[]; total: number } {
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts.coachId) {
    where.push("s.coach_id = @coachId");
    params.coachId = opts.coachId;
  }
  if (opts.status && opts.status !== "all") {
    where.push("s.status = @status");
    params.status = opts.status;
  }
  if (opts.search) {
    where.push("(s.member_name LIKE @q OR s.member_phone LIKE @q OR s.order_id LIKE @q)");
    params.q = `%${opts.search}%`;
  }

  const clause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  const rows = getDb()
    .prepare(`${SELECT}${clause} ORDER BY s.created_at DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset }) as JoinedRow[];
  const total = (getDb().prepare(`SELECT COUNT(*) AS n FROM subscriptions s${clause}`).get(params) as { n: number }).n;

  return { items: rows.map(toSubscription), total };
}

export function createSubscription(input: {
  orderId: string;
  memberName: string;
  memberPhone: string;
  memberGoal?: string | null;
  planName: string;
  cycle: string;
  months: number;
  addonIds: string[];
  coupon?: string | null;
  total: number;
  perMonth: number;
  payment: string;
  paymentRef?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  coachId?: string | null;
  endsAt: number;
}): Subscription {
  const ts = now();
  getDb()
    .prepare(
      `INSERT INTO subscriptions
        (order_id, member_name, member_phone, member_goal, plan_name, cycle, months, addon_ids, coupon,
         total, per_month, payment_method, payment_ref, card_brand, card_last4, coach_id, status,
         created_at, updated_at, ends_at)
       VALUES (@orderId, @memberName, @memberPhone, @memberGoal, @planName, @cycle, @months, @addonIds, @coupon,
         @total, @perMonth, @payment, @paymentRef, @cardBrand, @cardLast4, @coachId, 'active',
         @ts, @ts, @endsAt)
       ON CONFLICT(order_id) DO UPDATE SET updated_at = @ts`, // idempotency: نفس رقم الطلب مايتسجلش مرتين
    )
    .run({
      orderId: input.orderId,
      memberName: input.memberName,
      memberPhone: input.memberPhone,
      memberGoal: input.memberGoal ?? null,
      planName: input.planName,
      cycle: input.cycle,
      months: input.months,
      addonIds: JSON.stringify(input.addonIds.slice(0, 12)),
      coupon: input.coupon ?? null,
      total: Math.round(input.total),
      perMonth: Math.round(input.perMonth),
      payment: input.payment,
      paymentRef: input.paymentRef ?? null,
      cardBrand: input.cardBrand ?? null,
      cardLast4: input.cardLast4 ?? null,
      coachId: input.coachId ?? null,
      ts,
      endsAt: input.endsAt,
    });
  return getSubscription(input.orderId)!;
}

export function setSubscriptionStatus(
  orderId: string,
  status: SubStatus,
  actor?: { id: string; reason?: string | null },
): Subscription | null {
  const ts = now();
  const res = getDb()
    .prepare(
      `UPDATE subscriptions SET
        status = @status,
        updated_at = @ts,
        cancelled_at  = CASE WHEN @status = 'cancelled' THEN @ts ELSE NULL END,
        cancelled_by  = CASE WHEN @status = 'cancelled' THEN @actor ELSE NULL END,
        cancel_reason = CASE WHEN @status = 'cancelled' THEN @reason ELSE NULL END
       WHERE order_id = @orderId`,
    )
    .run({ orderId, status, ts, actor: actor?.id ?? null, reason: actor?.reason ?? null });
  return res.changes ? getSubscription(orderId) : null;
}

export function assignCoach(orderId: string, coachId: string | null): Subscription | null {
  const res = getDb()
    .prepare("UPDATE subscriptions SET coach_id = @coachId, updated_at = @ts WHERE order_id = @orderId")
    .run({ orderId, coachId, ts: now() });
  return res.changes ? getSubscription(orderId) : null;
}

/** حذف نهائي — للمدير العام بس (الـ guard في الـ route) */
export function deleteSubscription(orderId: string): boolean {
  return getDb().prepare("DELETE FROM subscriptions WHERE order_id = ?").run(orderId).changes > 0;
}

/** بيحوّل الاشتراكات اللي عدّى ميعادها لـ expired — بينده قبل أي إحصائيات */
export function expireOverdue(): number {
  return getDb()
    .prepare("UPDATE subscriptions SET status = 'expired', updated_at = @ts WHERE status IN ('active','frozen') AND ends_at < @ts")
    .run({ ts: now() }).changes;
}

export function subscriptionStats(coachId?: string | null) {
  const scope = coachId ? " WHERE coach_id = @coachId" : "";
  const params = coachId ? { coachId } : {};
  const db = getDb();

  const totals = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END), 0) AS active,
        COALESCE(SUM(CASE WHEN status = 'frozen'    THEN 1 ELSE 0 END), 0) AS frozen,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled,
        COALESCE(SUM(CASE WHEN status = 'expired'   THEN 1 ELSE 0 END), 0) AS expired,
        COALESCE(SUM(CASE WHEN status IN ('active','frozen') THEN total ELSE 0 END), 0) AS revenue
       FROM subscriptions${scope}`,
    )
    .get(params) as { total: number; active: number; frozen: number; cancelled: number; expired: number; revenue: number };

  const byPlan = db
    .prepare(`SELECT plan_name AS plan, COUNT(*) AS count FROM subscriptions${scope} GROUP BY plan_name ORDER BY count DESC`)
    .all(params) as { plan: string; count: number }[];

  return { ...totals, byPlan };
}
