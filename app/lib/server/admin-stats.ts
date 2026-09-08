import { sql } from "drizzle-orm";
import { ADDONS, PLANS } from "@/app/lib/data";
import { getRepo, type DbSnapshot, type SqlClient } from "./db";
import { bookings as bookingsTable, payments as paymentsTable, subscriptions as subscriptionsTable } from "./db/schema";

/**
 * أرقام لوحة الإدارة.
 *
 * فيه مسارين بيرجّعوا **نفس شكل `AdminOverview` بالظبط**:
 *   • `sqlOverview`     — Postgres: aggregates بتتحسب جوه الداتابيز
 *                         (`count(*) filter`, `sum`, `group by`, `jsonb_array_elements_text`,
 *                          و bucket لكل يوم في آخر 7 أيام) — مفيش صف واحد بيتسحب للتطبيق.
 *   • `computeOverview` — وضع الذاكرة: نفس الحسابات في JS، دالة صافية سهلة الاختبار.
 *
 * `buildOverview` بتختار المسار حسب الأدابتر الشغال، والاختبارات بتقارن الاتنين ببعض.
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

const dayLabel = (ts: number) => new Intl.DateTimeFormat("ar-EG", { weekday: "short", day: "numeric" }).format(new Date(ts));

const sandboxMode = () => (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "sandbox") === "sandbox";

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

/** دمج نتيجة `group by plan` مع كتالوج الباقات: كل باقة معروفة بتظهر حتى لو 0 */
function mergePlans(rows: { id: string; name: string; count: number; revenue: number }[]) {
  const byPlan = PLANS.map((p) => {
    const hit = rows.filter((r) => r.id === p.id || r.name === p.name);
    return { id: p.id, name: p.name, count: hit.reduce((s, r) => s + r.count, 0), revenue: hit.reduce((s, r) => s + r.revenue, 0) };
  });
  // أي باقة جاية من باك إند خارجي مش في PLANS تتحسب برضه (متجمّعة بنفس المفتاح)
  const extras = new Map<string, { id: string; name: string; count: number; revenue: number }>();
  for (const r of rows) {
    if (byPlan.some((b) => b.id === r.id || b.name === r.name)) continue;
    const key = `${r.id}|${r.name}`;
    const cur = extras.get(key);
    if (cur) {
      cur.count += r.count;
      cur.revenue += r.revenue;
    } else {
      extras.set(key, { ...r });
    }
  }
  return [...byPlan, ...extras.values()];
}

/** دمج نتيجة `group by addon` مع كتالوج الإضافات (بنفس ترتيب الكتالوج، والصفر بيتشال) */
const mergeAddons = (counts: Record<string, number>) =>
  ADDONS.map((a) => ({ id: a.id, name: a.name, count: counts[a.id] ?? 0 }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count);

/* =============================== وضع الذاكرة =============================== */

/** نفس الأرقام محسوبة في JS من لقطة المخزن — دالة صافية (بتتختبر من غير داتابيز) */
export function computeOverview(snap: DbSnapshot, now = Date.now()): AdminOverview {
  const { orders, bookings, payments } = snap;
  const today0 = startOfDay(now);
  const week0 = today0 - 6 * DAY;

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const todayOrders = orders.filter((o) => o.createdAt >= today0);
  const weekOrders = orders.filter((o) => o.createdAt >= week0);

  const planRows = orders.map((o) => ({ id: o.planId || o.planName, name: o.planName, count: 1, revenue: o.total }));
  const byPlan = mergePlans(planRows);

  const addonCounts = countBy(
    orders.flatMap((o) => o.addonIds.map((id) => ({ id }))),
    (a) => a.id,
  );

  const daily = Array.from({ length: 7 }, (_, i) => {
    const from = week0 + i * DAY;
    const to = from + DAY;
    const dayOrders = orders.filter((o) => o.createdAt >= from && o.createdAt < to);
    return {
      day: dayLabel(from),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: dayOrders.length,
      bookings: bookings.filter((b) => b.createdAt >= from && b.createdAt < to).length,
    };
  });

  const succeeded = payments.filter((p) => p.status === "succeeded");

  return {
    generatedAt: now,
    bootedAt: snap.bootedAt,
    sandbox: sandboxMode(),
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
      addons: mergeAddons(addonCounts),
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

/* ================================ وضع Postgres ================================ */

type Row = Record<string, unknown>;
const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const int = (v: unknown) => Math.round(num(v));
const text = (v: unknown) => (v == null ? "" : String(v));

/** تنفيذ استعلام خام وإرجاع صفوفه (نفس الشكل في neon-http و PGlite و node-postgres) */
async function rows(client: SqlClient, query: Parameters<SqlClient["execute"]>[0]): Promise<Row[]> {
  const res = (await client.execute(query)) as unknown as { rows?: Row[] } | Row[];
  return Array.isArray(res) ? res : (res.rows ?? []);
}

/** تحويل صفوف `dim/key/count` لخريطة زي `countBy` */
const dimMap = (list: Row[], dim: string) =>
  list.filter((r) => text(r.dim) === dim).reduce<Record<string, number>>((m, r) => ({ ...m, [text(r.key)]: int(r.count) }), {});

const dimList = (list: Row[], dim: string) => list.filter((r) => text(r.dim) === dim).map((r) => ({ key: text(r.key), count: int(r.count) }));

/**
 * نفس `AdminOverview` بس محسوبة كلها في Postgres:
 * 7 استعلامات aggregate بتتنفّذ بالتوازي (round-trip واحد لكل واحد على HTTP driver).
 */
export async function sqlOverview(client: SqlClient, bootedAt: number, now = Date.now()): Promise<AdminOverview> {
  const today0 = startOfDay(now);
  const week0 = today0 - 6 * DAY;
  const todayIso = new Date(today0).toISOString();
  const weekIso = new Date(week0).toISOString();
  const nowIso = new Date(now).toISOString();

  const subs = subscriptionsTable;
  const bks = bookingsTable;
  const pays = paymentsTable;

  const [orderTotals, orderDims, bookingTotals, bookingDims, paymentTotals, paymentDims, dailyRows] = await Promise.all([
    // 1) إجماليات الاشتراكات + الإيراد + الضريبة
    rows(
      client,
      sql`
        select
          count(*)::int                                                                        as total,
          count(*) filter (where created_at >= ${todayIso}::timestamptz)::int                  as today_count,
          count(*) filter (where status = 'active'
                             and (ends_at is null or ends_at >= ${nowIso}::timestamptz))::int  as active,
          coalesce(sum(total), 0)::float8                                                      as revenue,
          coalesce(sum(total) filter (where created_at >= ${todayIso}::timestamptz), 0)::float8 as revenue_today,
          coalesce(sum(total) filter (where created_at >= ${weekIso}::timestamptz), 0)::float8  as revenue_week,
          coalesce(round(avg(total)), 0)::int                                                  as avg_order,
          coalesce(round(sum(total) * 14 / 114), 0)::int                                       as vat
        from ${subs}
      `,
    ),
    // 2) تقسيمات الاشتراكات: باقة / مدة / طريقة دفع / كوبون / إضافات (jsonb)
    rows(
      client,
      sql`
        select 'plan'::text as dim, coalesce(plan_id, plan_name, '') as key, coalesce(plan_name, '') as label,
               count(*)::int as count, coalesce(sum(total), 0)::float8 as revenue
          from ${subs} group by plan_id, plan_name
        union all
        select 'cycle', cycle, '', count(*)::int, 0::float8
          from ${subs} where cycle is not null and cycle <> '' group by cycle
        union all
        select 'payment', payment, '', count(*)::int, 0::float8
          from ${subs} where payment is not null and payment <> '' group by payment
        union all
        select 'coupon', coupon, '', count(*)::int, 0::float8
          from ${subs} where coupon is not null and coupon <> '' group by coupon
        union all
        select 'addon', a.id, '', count(*)::int, 0::float8
          from ${subs} s cross join lateral jsonb_array_elements_text(s.addon_ids) as a(id)
          -- الحارس ده مهم: صف واحد فيه addon_ids مش array (استيراد قديم / باك إند تاني)
          -- كان هيوقّع اللوحة كلها بـ «cannot extract elements from a scalar»
          where jsonb_typeof(s.addon_ids) = 'array' group by a.id
        order by count desc, key asc
      `,
    ),
    // 3) إجماليات الحجوزات
    rows(
      client,
      sql`
        select
          count(*)::int                                                           as total,
          count(*) filter (where created_at >= ${todayIso}::timestamptz)::int     as today_count,
          count(*) filter (where status <> 'confirmed')::int                      as pending
        from ${bks}
      `,
    ),
    // 4) تقسيمات الحجوزات: الهدف / الوقت المفضل
    rows(
      client,
      sql`
        select 'goal'::text as dim, goal as key, count(*)::int as count
          from ${bks} where goal is not null and goal <> '' group by goal
        union all
        select 'slot', slot, count(*)::int
          from ${bks} where slot is not null and slot <> '' group by slot
        order by count desc, key asc
      `,
    ),
    // 5) إجماليات الدفع
    rows(
      client,
      sql`
        select
          count(*)::int                                                                          as total,
          count(*) filter (where status = 'succeeded')::int                                      as succeeded,
          count(*) filter (where status = 'requires_action')::int                                as requires_action,
          count(*) filter (where status = 'failed')::int                                         as failed,
          coalesce(sum(amount) filter (where status = 'succeeded'), 0)::float8                   as volume
        from ${pays}
      `,
    ),
    // 6) تقسيمات الدفع: الشبكة (كروت بس) / أكواد الرفض
    rows(
      client,
      sql`
        select 'brand'::text as dim, brand as key, count(*)::int as count
          from ${pays} where method = 'card' and brand is not null and brand <> '' group by brand
        union all
        select 'code', error_code, count(*)::int
          from ${pays} where status = 'failed' and error_code is not null and error_code <> '' group by error_code
        order by count desc, key asc
      `,
    ),
    // 7) آخر 7 أيام — bucket لكل يوم من بداية اليوم المحلي للسيرفر
    rows(
      client,
      sql`
        select bucket,
               coalesce(sum(revenue), 0)::float8 as revenue,
               coalesce(sum(orders), 0)::int     as orders,
               coalesce(sum(bookings), 0)::int   as bookings
        from (
          select floor((extract(epoch from created_at) * 1000 - ${week0}::float8) / 86400000)::int as bucket,
                 total::float8 as revenue, 1 as orders, 0 as bookings
            from ${subs} where created_at >= ${weekIso}::timestamptz
          union all
          select floor((extract(epoch from created_at) * 1000 - ${week0}::float8) / 86400000)::int,
                 0::float8, 0, 1
            from ${bks} where created_at >= ${weekIso}::timestamptz
        ) buckets
        where bucket between 0 and 6
        group by bucket
      `,
    ),
  ]);

  const o = orderTotals[0] ?? {};
  const b = bookingTotals[0] ?? {};
  const p = paymentTotals[0] ?? {};

  const planRows = orderDims
    .filter((r) => text(r.dim) === "plan")
    .map((r) => ({ id: text(r.key), name: text(r.label) || text(r.key), count: int(r.count), revenue: int(r.revenue) }));

  const daily = Array.from({ length: 7 }, (_, i) => {
    const hit = dailyRows.find((r) => int(r.bucket) === i);
    return {
      day: dayLabel(week0 + i * DAY),
      revenue: int(hit?.revenue),
      orders: int(hit?.orders),
      bookings: int(hit?.bookings),
    };
  });

  return {
    generatedAt: now,
    bootedAt,
    sandbox: sandboxMode(),
    revenue: {
      total: int(o.revenue),
      today: int(o.revenue_today),
      week: int(o.revenue_week),
      avgOrder: int(o.avg_order),
      vat: int(o.vat),
    },
    orders: {
      total: int(o.total),
      today: int(o.today_count),
      active: int(o.active),
      byPlan: mergePlans(planRows),
      byCycle: dimMap(orderDims, "cycle"),
      byPayment: dimMap(orderDims, "payment"),
      addons: mergeAddons(dimMap(orderDims, "addon")),
      coupons: dimList(orderDims, "coupon").map((c) => ({ code: c.key, count: c.count })),
    },
    bookings: {
      total: int(b.total),
      today: int(b.today_count),
      pending: int(b.pending),
      byGoal: dimList(bookingDims, "goal").map((g) => ({ goal: g.key, count: g.count })),
      bySlot: dimList(bookingDims, "slot").map((s) => ({ slot: s.key, count: s.count })),
    },
    payments: {
      total: int(p.total),
      succeeded: int(p.succeeded),
      requiresAction: int(p.requires_action),
      failed: int(p.failed),
      volume: int(p.volume),
      declineCodes: dimList(paymentDims, "code").map((d) => ({ code: d.key, count: d.count })),
      byBrand: dimMap(paymentDims, "brand"),
    },
    daily,
  };
}

/* ================================= الواجهة ================================= */

/** أرقام اللوحة من الأدابتر الشغال: SQL aggregates على Postgres، أو حساب في الذاكرة */
export async function buildOverview(now = Date.now()): Promise<AdminOverview> {
  const repo = await getRepo();
  if (repo.sql) return sqlOverview(repo.sql, repo.bootedAt(), now);
  return computeOverview(await repo.snapshot(), now);
}
