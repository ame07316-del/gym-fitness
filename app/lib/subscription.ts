import { ADDONS, COUPONS, CYCLES, PLANS, VAT_RATE } from "./data";
import type { Coupon, CycleId, PlanId } from "./data";

export type Draft = {
  planId: PlanId;
  cycle: CycleId;
  addonIds: string[];
  coupon: string | null;
};

export type Quote = {
  planName: string;
  cycleLabel: string;
  months: number;
  baseMonthly: number;
  addonsMonthly: number;
  subtotal: number;
  cycleDiscount: number;
  couponDiscount: number;
  net: number;
  vat: number;
  total: number;
  perMonth: number;
  monthlyIfMonthly: number;
  saved: number;
  savedPct: number;
  coupon: Coupon | null;
  couponError: string | null;
};

/** كل المبالغ بتتقرّب لأقرب قرشين — عشان الفلوس ما تتلغشطش في الفوترة */
const r2 = (n: number) => Math.round(n * 100) / 100;

export const findPlan = (id: PlanId) => PLANS.find((p) => p.id === id) ?? PLANS[1];
export const findCycle = (id: CycleId) => CYCLES.find((c) => c.id === id) ?? CYCLES[0];
export const addonById = (id: string) => ADDONS.find((a) => a.id === id);

export function matchCoupon(code: string): Coupon | null {
  const c = code.trim().toUpperCase();
  return COUPONS.find((x) => x.code === c) ?? null;
}

/** محرك حساب الاشتراك: خصم المدة + الإضافات + الكوبون + ضريبة القيمة المضافة */
export function quoteOf(draft: Draft): Quote {
  const plan = findPlan(draft.planId);
  const cycle = findCycle(draft.cycle);
  const months = cycle.months;

  const planTotal = plan.monthly * months;
  const addonsMonthly = draft.addonIds.reduce((s, id) => s + (addonById(id)?.price ?? 0), 0);
  const addonsTotal = addonsMonthly * months;
  const subtotal = planTotal + addonsTotal;

  const cycleDiscount = r2(planTotal * cycle.off);
  const afterCycle = r2(subtotal - cycleDiscount);

  const coupon = draft.coupon ? matchCoupon(draft.coupon) : null;
  let couponDiscount = 0;
  let couponError: string | null = null;

  if (draft.coupon && draft.coupon.trim()) {
    if (!coupon) couponError = "الكود غير صحيح — جرّب FIT10";
    else if (subtotal < coupon.min) couponError = `الكود يبدأ من ${coupon.min.toLocaleString("ar-EG")} ج.م`;
    else {
      couponDiscount = r2(afterCycle * coupon.off);
      if (coupon.max) couponDiscount = Math.min(couponDiscount, coupon.max);
    }
  }

  const net = r2(Math.max(0, afterCycle - couponDiscount));
  const vat = r2(net * VAT_RATE);
  const total = r2(net + vat);
  const monthlyIfMonthly = r2(plan.monthly * (1 + VAT_RATE) + addonsMonthly * (1 + VAT_RATE));
  const saved = r2(Math.max(0, monthlyIfMonthly * months - total));

  return {
    planName: plan.name,
    cycleLabel: cycle.label,
    months,
    baseMonthly: plan.monthly,
    addonsMonthly,
    subtotal,
    cycleDiscount,
    couponDiscount,
    net,
    vat,
    total,
    perMonth: total / months,
    monthlyIfMonthly,
    saved,
    savedPct: monthlyIfMonthly * months > 0 ? saved / (monthlyIfMonthly * months) : 0,
    coupon,
    couponError,
  };
}

export function addMonths(ts: number, months: number) {
  const d = new Date(ts);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.getTime();
}

export type SubStatus = "active" | "frozen" | "cancelled" | "expired";

export type Membership = {
  orderId: string;
  planId: PlanId;
  planName: string;
  cycle: CycleId;
  addonIds: string[];
  coupon: string | null;
  member: { name: string; phone: string; goal: string };
  payment: string;
  total: number;
  perMonth: number;
  startedAt: number;
  endsAt: number;
  months: number;
  status: SubStatus;
  autoRenew: boolean;
  frozenAt: number | null;
  frozenDaysUsed: number;
};

export const statusLabel: Record<SubStatus, string> = {
  active: "نشط",
  frozen: "مجمّد مؤقتاً",
  cancelled: "ملغي",
  expired: "منتهي",
};

/** كود بطاقة العضوية — QR مبسّط بشكل grid ثابت من الـ id */
export function cardPattern(id: string, size = 9): boolean[][] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const grid: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      const corner = (r < 2 && c < 2) || (r < 2 && c > size - 3) || (r > size - 3 && c < 2);
      row.push(corner ? (r + c) % 2 === 0 : (h & 7) > 2);
    }
    grid.push(row);
  }
  return grid;
}
