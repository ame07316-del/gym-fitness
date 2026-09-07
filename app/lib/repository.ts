import { supabaseAdmin } from "@/app/lib/supabase-admin";

export type PersistedBooking = {
  id: string;
  name: string;
  phone: string;
  goal: string;
  slot: string;
  plan: string;
  status: string;
  createdAt: number;
};

export type PersistedSubscription = {
  orderId: string;
  planId: "basic" | "pro" | "vip";
  planName: string;
  cycle: "monthly" | "quarterly" | "semiannual" | "yearly";
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

type BookingRow = {
  id: string;
  name: string;
  phone: string;
  goal: string;
  slot: string;
  plan: string;
  status: string;
  created_at: number;
};

type SubscriptionRow = {
  order_id: string;
  plan_id: PersistedSubscription["planId"];
  plan_name: string;
  cycle: PersistedSubscription["cycle"];
  months: number;
  addon_ids: string[];
  coupon: string | null;
  total: number | string;
  per_month: number | string;
  member_name: string;
  member_phone: string;
  member_goal: string;
  payment: string;
  status: string;
  created_at: number;
  ends_at: number;
};

const bookingRow = (record: PersistedBooking): BookingRow => ({
  id: record.id,
  name: record.name,
  phone: record.phone,
  goal: record.goal,
  slot: record.slot,
  plan: record.plan,
  status: record.status,
  created_at: record.createdAt,
});

const subscriptionRow = (record: PersistedSubscription): SubscriptionRow => ({
  order_id: record.orderId,
  plan_id: record.planId,
  plan_name: record.planName,
  cycle: record.cycle,
  months: record.months,
  addon_ids: record.addonIds,
  coupon: record.coupon,
  total: record.total,
  per_month: record.perMonth,
  member_name: record.member.name,
  member_phone: record.member.phone,
  member_goal: record.member.goal,
  payment: record.payment,
  status: record.status,
  created_at: record.createdAt,
  ends_at: record.endsAt,
});

const mapBooking = (row: BookingRow): PersistedBooking => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  goal: row.goal,
  slot: row.slot,
  plan: row.plan,
  status: row.status,
  createdAt: Number(row.created_at),
});

const mapSubscription = (row: SubscriptionRow): PersistedSubscription => ({
  orderId: row.order_id,
  planId: row.plan_id,
  planName: row.plan_name,
  cycle: row.cycle,
  months: Number(row.months),
  addonIds: Array.isArray(row.addon_ids) ? row.addon_ids : [],
  coupon: row.coupon ?? null,
  total: Number(row.total),
  perMonth: Number(row.per_month),
  member: { name: row.member_name, phone: row.member_phone, goal: row.member_goal },
  payment: row.payment,
  status: row.status,
  createdAt: Number(row.created_at),
  endsAt: Number(row.ends_at),
});

function requireClient() {
  if (!supabaseAdmin) throw new Error("Supabase is not configured");
  return supabaseAdmin;
}

export async function insertBooking(record: PersistedBooking) {
  const client = requireClient();
  const { data, error } = await client.from("bookings").insert(bookingRow(record)).select("*").single();
  if (error) throw error;
  return mapBooking(data as BookingRow);
}

export async function listBookings() {
  const client = requireClient();
  const { data, count, error } = await client
    .from("bookings")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  const items = (data as BookingRow[]).map(mapBooking);
  return {
    total: count ?? items.length,
    pending: items.filter((item) => item.status !== "confirmed").length,
    items,
  };
}

export async function findSubscription(orderId: string) {
  const client = requireClient();
  const { data, error } = await client.from("subscriptions").select("*").eq("order_id", orderId).maybeSingle();
  if (error) throw error;
  return data ? mapSubscription(data as SubscriptionRow) : null;
}

export async function insertSubscription(record: PersistedSubscription) {
  const client = requireClient();
  const { data, error } = await client.from("subscriptions").insert(subscriptionRow(record)).select("*").single();
  if (error) {
    // The unique order_id constraint makes retries safe even if two requests
    // arrive at the same time.
    if (error.code === "23505") return { duplicate: true, record: await findSubscription(record.orderId) };
    throw error;
  }
  return { duplicate: false, record: mapSubscription(data as SubscriptionRow) };
}

export async function listSubscriptions() {
  const client = requireClient();
  const [itemsResult, totalsResult] = await Promise.all([
    client.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(25),
    client.from("subscriptions").select("total, plan_name"),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (totalsResult.error) throw totalsResult.error;

  const items = (itemsResult.data as SubscriptionRow[]).map(mapSubscription);
  const totals = totalsResult.data as Array<{ total: number | string; plan_name: string }>;
  return {
    total: totals.length,
    revenue: totals.reduce((sum, item) => sum + Number(item.total), 0),
    byPlan: totals.reduce<Record<string, number>>((result, item) => {
      result[item.plan_name] = (result[item.plan_name] ?? 0) + 1;
      return result;
    }, {}),
    items,
  };
}
