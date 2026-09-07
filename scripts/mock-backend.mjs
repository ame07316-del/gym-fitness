/**
 * باك إند وهمي للتحقق من عقد الـ API — بديل مؤقت لـ Laravel أثناء التطوير.
 * تشغيل:  node scripts/mock-backend.mjs          (بيسمع على :8000)
 * بعدين:  BACKEND_URL=http://127.0.0.1:8000      في .env.local → كل /api/* هييجي هنا.
 *
 * الردود بنفس شكل docs/BACKEND-CONTRACT.md بالظبط، فممكن تقارن بيها ردودك.
 *
 * ملاحظة مهمة: مفيش دفع بالكروت خالص — والأسعار بتتحسب هنا على السيرفر،
 * أي مبلغ جاي من المتصفح بيتتجاهل.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 8000);
const bookings = [];
const subscriptions = [];

const digits = (v) => String(v ?? "").replace(/\D/g, "");
const phoneOk = (v) => /^(?:\+?2|002)?01[0-9]{9}$/.test(digits(v));
const nameOk = (v) => typeof v === "string" && v.trim().length >= 3;

/* ---------- محرك التسعير (نسخة مبسطة من app/lib/subscription.ts) ---------- */
const PLANS = { basic: { name: "أساسي", monthly: 500 }, pro: { name: "برو", monthly: 800 }, vip: { name: "VIP", monthly: 1450 } };
const CYCLES = {
  monthly: { label: "شهري", months: 1, off: 0 },
  quarterly: { label: "٣ شهور", months: 3, off: 0.08 },
  semiannual: { label: "٦ شهور", months: 6, off: 0.14 },
  yearly: { label: "سنوي", months: 12, off: 0.2 },
};
const ADDONS = { pt: 1200, nutrition: 450, inbody: 250, crossfit: 600, sauna: 300, locker: 150 };
const COUPONS = { FIT10: { off: 0.1, min: 0 }, NEW25: { off: 0.25, min: 1500, max: 1500 }, YEAR20: { off: 0.2, min: 4000 }, REFERRAL: { off: 0.15, min: 0 } };
const VAT = 0.14;
const r2 = (n) => Math.round(n * 100) / 100;

function priceOf(body) {
  const errors = {};
  const plan = PLANS[body.planId];
  if (!plan) errors.planId = "الباقة دي مش موجودة";
  const cycle = CYCLES[body.cycle];
  if (!cycle) errors.cycle = "مدة الاشتراك دي مش موجودة";
  const ids = Array.isArray(body.addonIds) ? [...new Set(body.addonIds)] : [];
  if (ids.some((id) => !(id in ADDONS))) errors.addonIds = "فيه إضافة مش موجودة";
  if (Object.keys(errors).length) return { errors };

  const months = cycle.months;
  const planTotal = plan.monthly * months;
  const addonsMonthly = ids.reduce((t, id) => t + ADDONS[id], 0);
  const subtotal = planTotal + addonsMonthly * months;
  const cycleDiscount = r2(planTotal * cycle.off);
  const afterCycle = r2(subtotal - cycleDiscount);

  const code = String(body.coupon ?? "").trim().toUpperCase();
  const coupon = COUPONS[code];
  let couponDiscount = 0;
  let couponError = null;
  if (code) {
    if (!coupon) couponError = "الكود غير صحيح — جرّب FIT10";
    else if (subtotal < coupon.min) couponError = `الكود يبدأ من ${coupon.min} ج.م`;
    else couponDiscount = Math.min(r2(afterCycle * coupon.off), coupon.max ?? Infinity);
  }

  const net = r2(Math.max(0, afterCycle - couponDiscount));
  const vat = r2(net * VAT);
  const total = r2(net + vat);
  return {
    errors: {},
    quote: {
      planName: plan.name,
      cycleLabel: cycle.label,
      months,
      subtotal,
      cycleDiscount,
      couponDiscount,
      net,
      vat,
      total,
      perMonth: r2(total / months),
      coupon: coupon ? code : null,
      couponError,
    },
  };
}

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://x").pathname;
  const method = req.method ?? "GET";
  console.log(`[mock-backend] ${method} ${path}`);

  if (method === "OPTIONS") return json(res, 204, {});

  /* ---------- bookings ---------- */
  if (path === "/api/bookings" && method === "POST") {
    const b = await readBody(req);
    const fields = {};
    if (!nameOk(b.name)) fields.name = "من فضلك اكتب اسمك الكامل (3 أحرف على الأقل)";
    if (!phoneOk(b.phone)) fields.phone = "رقم موبايل مصري غير صحيح — مثال: 01012345678";
    if (Object.keys(fields).length) return json(res, 422, { error: "بيانات ناقصة", fields });

    const rec = {
      id: b.id || `BK-${Date.now().toString(36).toUpperCase()}`,
      name: String(b.name).trim(),
      phone: digits(b.phone),
      goal: b.goal || "غير محدد",
      slot: b.slot || "أي وقت",
      plan: b.plan || "استعلام",
      status: "confirmed",
      createdAt: Date.now(),
    };
    bookings.unshift(rec);
    return json(res, 201, { ok: true, booking: rec, queue: bookings.length, message: `تم استلام طلب ${rec.name}` });
  }
  if (path === "/api/bookings" && method === "GET") return json(res, 200, { total: bookings.length, items: bookings.slice(0, 25) });

  /* ---------- subscriptions ---------- */
  if (path === "/api/subscribe" && method === "POST") {
    const s = await readBody(req);
    const fields = {};
    const member = s.member ?? {};
    if (!nameOk(member.name)) fields["member.name"] = "اسم العضو مطلوب";
    if (!phoneOk(member.phone)) fields["member.phone"] = "رقم موبايل غير صحيح";
    if (!["wallet", "cash"].includes(s.payment)) fields.payment = "اختار طريقة دفع صحيحة";

    // السعر بيتحسب هنا — أي total جاي من العميل بيتتجاهل تمامًا
    const { errors, quote } = priceOf(s);
    Object.assign(fields, errors);
    if (Object.keys(fields).length) return json(res, 422, { error: "بيانات الاشتراك غير مكتملة", fields });
    if (quote.couponError) return json(res, 422, { error: quote.couponError, fields: { coupon: quote.couponError } });

    const orderId = `FZ-${Date.now().toString(36).toUpperCase()}`;
    const createdAt = Date.now();
    const record = {
      orderId,
      planId: s.planId,
      planName: quote.planName,
      cycle: s.cycle,
      months: quote.months,
      addonIds: Array.isArray(s.addonIds) ? s.addonIds : [],
      coupon: quote.coupon,
      total: quote.total,
      perMonth: quote.perMonth,
      member: { name: String(member.name).trim(), phone: digits(member.phone), goal: member.goal ?? "" },
      payment: s.payment,
      paymentRef: s.paymentRef ? String(s.paymentRef).slice(0, 64) : null,
      status: "pending",
      createdAt,
      endsAt: createdAt + quote.months * 30 * 86400000,
    };
    subscriptions.unshift({ ...record, source: "mock-backend" });
    return json(res, 201, {
      ok: true,
      order: record,
      invoice: `INV-${orderId}`,
      message: `تم تسجيل طلب عضوية ${record.member.name} — ${record.planName}`,
    });
  }

  /* ---------- التسعيرة الرسمية ---------- */
  if (path === "/api/quote" && method === "POST") {
    const body = await readBody(req);
    const { errors, quote } = priceOf(body);
    if (Object.keys(errors).length) return json(res, 422, { error: "بيانات الاشتراك غير صحيحة", fields: errors });
    return json(res, 200, { ok: true, draft: { planId: body.planId, cycle: body.cycle, addonIds: body.addonIds ?? [], coupon: quote.coupon }, quote });
  }

  if (path === "/api/subscribe" && method === "GET") {
    const revenue = subscriptions.reduce((t, s) => t + Number(s.total || 0), 0);
    return json(res, 200, { total: subscriptions.length, revenue, items: subscriptions.slice(0, 25) });
  }

  return json(res, 404, { error: `مسار غير معروف: ${method} ${path}` });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[mock-backend] شغال على http://0.0.0.0:${PORT}`);
  console.log(`[mock-backend] حط BACKEND_URL=http://127.0.0.1:${PORT} في .env.local`);
});
