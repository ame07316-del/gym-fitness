import { db } from "./db";
import { ADDONS, PLANS } from "@/app/lib/data";

/**
 * تجميع أرقام لوحة الإدارة من مخزن الذاكرة — دالة صافية عشان تتختبر بسهولة
 * وعشان لما الداتابيز الحقيقية تيجي، تتبدل بـ SQL aggregate واحد.
 */
export type AdminOverview = {
  generatedAt: number;
  bootedAt: number;
  sandbox: boolean;
  revenue: { total: number; today: number; week: number; avgOrder: number; vat: number };
  orders: { total: number; today: number; active: number; byPlan: { id: string; name: string; count: number; revenue: number }[]; byCycle: Record<string, number>; byPayment: Record<string, number>; addons: { id: string; name: string; count: number }[]; coupons: { code: string; count: number }[] };
  bookings: { total: number; today: number; pending: number; byGoal: { goal: string; count: number }[]; bySlot: { slot: string; count: number }[] };
  payments: { total: number; succeeded: number; requiresAction: number; failed: number; volume: number; declineCodes: { code: string; count: number }[]; byBrand: Record<string, number> };
  daily: { day: string; revenue: number; orders: number; bookings: number }[];
};

const DAY = 86_400_000;
const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const countBy = <T>(items: T[], pick: (t: T) => string | null | undefined) =>
  items.reduce<Record<string, number>>((m, it) => {
    const k = pick(it);
    if (k) m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});

const toSorted = (rec: Record<string, number>) =>
  Object.entries(rec)
    .map(([k, count]) => ({ key: k, count }))
    .sort((a, b) => b.count - a.count);

export function buildOverview(now = Date.now()): AdminOverview {
  const { orders, bookings, intents } = db;
  const payments = [...intents.values()];
  const today0 = startOfDay(now);
  const week0 = today0 - 6 * DAY;

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const todayOrders = orders.filter((o) => o.createdAt >= today0);
  const weekOrders = orders.filter((o) => o.createdAt >= week0);

  const byPlan: AdminOverview["orders"]["byPlan"] = PLANS.map((p) => {
    const rows = orders.filter((o) => o.planId === p.id || o.planName === p.name);
    return { id: p.id, name: p.name, count: rows.length, revenue: rows.reduce((s, o) => s + o.total, 0) };
  });
  // أي باقة جاية من باك إند خارجي مش في PLANS تتحسب برضه
  for (const o of orders) {
    if (!byPlan.some((b) => b.id === o.planId || b.name === o.planName)) {
      byPlan.push({ id: o.planId || o.planName, name: o.planName, count: 1, revenue: o.total });
    }
  }

  const addonCounts = countBy(
    orders.flatMap((o) => o.addonIds.map((id) => ({ id }))),
    (a) => a.id,
  );
  const addons = ADDONS.map((a) => ({ id: a.id, name: a.name, count: addonCounts[a.id] ?? 0 }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count);

  const daily = Array.from({ length: 7 }, (_, i) => {
    const from = week0 + i * DAY;
    const to = from + DAY;
    const dayOrders = orders.filter((o) => o.createdAt >= from && o.createdAt < to);
    return {
      day: new Intl.DateTimeFormat("ar-EG", { weekday: "short", day: "numeric" }).format(new Date(from)),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: dayOrders.length,
      bookings: bookings.filter((b) => b.createdAt >= from && b.createdAt < to).length,
    };
  });

  const succeeded = payments.filter((p) => p.status === "succeeded");

  return {
    generatedAt: now,
    bootedAt: db.bootedAt,
    sandbox: (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "sandbox") === "sandbox",
    revenue: {
      total: revenue,
      today: todayOrders.reduce((s, o) => s + o.total, 0),
      week: weekOrders.reduce((s, o) => s + o.total, 0),
      avgOrder: orders.length ? Math.round(revenue / orders.length) : 0,
      // الإجمالي شامل 14% ض.ق.م — الضريبة = الإجمالي × 14/114
      vat: Math.round((revenue * 14) / 114),
    },
    orders: {
      total: orders.length,
      today: todayOrders.length,
      active: orders.filter((o) => o.status === "active" && o.endsAt >= now).length,
      byPlan,
      byCycle: countBy(orders, (o) => o.cycle),
      byPayment: countBy(orders, (o) => o.payment),
      addons,
      coupons: toSorted(countBy(orders, (o) => o.coupon)).map((c) => ({ code: c.key, count: c.count })),
    },
    bookings: {
      total: bookings.length,
      today: bookings.filter((b) => b.createdAt >= today0).length,
      pending: bookings.filter((b) => b.status !== "confirmed").length,
      byGoal: toSorted(countBy(bookings, (b) => b.goal)).map((g) => ({ goal: g.key, count: g.count })),
      bySlot: toSorted(countBy(bookings, (b) => b.slot)).map((s) => ({ slot: s.key, count: s.count })),
    },
    payments: {
      total: payments.length,
      succeeded: succeeded.length,
      requiresAction: payments.filter((p) => p.status === "requires_action").length,
      failed: payments.filter((p) => p.status === "failed").length,
      volume: succeeded.reduce((s, p) => s + p.amount, 0),
      declineCodes: toSorted(countBy(payments.filter((p) => p.status === "failed"), (p) => p.code)).map((d) => ({ code: d.key, count: d.count })),
      byBrand: countBy(payments.filter((p) => p.method === "card"), (p) => p.brand),
    },
    daily,
  };
}
