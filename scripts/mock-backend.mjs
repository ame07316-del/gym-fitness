/**
 * باك إند وهمي للتحقق من عقد الـ API — بديل مؤقت لـ Laravel أثناء التطوير.
 * تشغيل:  node scripts/mock-backend.mjs          (بيسمع على :8000)
 * بعدين:  BACKEND_URL=http://127.0.0.1:8000      في .env.local → كل /api/* هييجي هنا.
 *
 * الردود بنفس شكل docs/BACKEND-CONTRACT.md بالظبط، فممكن تقارن بيها ردودك.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 8000);
const bookings = [];
const subscriptions = [];
const intents = new Map();

const digits = (v) => String(v ?? "").replace(/\D/g, "");
const phoneOk = (v) => /^(\+?2)?01[0-9]{9}$/.test(digits(v));
const nameOk = (v) => typeof v === "string" && v.trim().length >= 3;

function luhn(n) {
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

const DECLINE = {
  "4000000000000002": "card_declined",
  "4000000000009995": "insufficient_funds",
  "4000000000009987": "expired_card",
  "4000000000006051": "incorrect_cvc",
};

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
    if (!(Number(s.total) > 0)) fields.total = "قيمة الاشتراك غير صحيحة";
    if (Object.keys(fields).length) return json(res, 422, { error: "بيانات العضو غير مكتملة", fields });

    // ⚠️ في الإنتاج: أعِد حساب السعر من الداتابيز وقارنه، متقبلش رقم العميل
    subscriptions.unshift({ ...s, createdAt: Date.now(), source: "mock-backend" });
    return json(res, 201, {
      ok: true,
      order: { orderId: s.orderId, status: "active", totalPaid: Number(s.total) },
      invoice: `INV-${s.orderId}`,
      message: `تم تفعيل عضوية ${member.name} — ${s.planName}`,
    });
  }
  if (path === "/api/subscribe" && method === "GET") {
    const revenue = subscriptions.reduce((t, s) => t + Number(s.total || 0), 0);
    return json(res, 200, { total: subscriptions.length, revenue, items: subscriptions.slice(0, 25) });
  }

  /* ---------- payment ---------- */
  if (path === "/api/pay" && method === "POST") {
    const p = await readBody(req);
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount <= 0) return json(res, 422, { error: "قيمة غير صالحة" });

    const reference = `pi_mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const n = digits(p.card?.number);
    let status = "succeeded";
    let message = "تم اعتماد العملية";
    let code = "succeeded";

    if (p.method !== "card") {
      message = p.method === "cash" ? "الحجز محجوز 48 ساعة للدفع في الفرع" : "بانتظار تأكيد تحويل المحفظة";
    } else if (DECLINE[n]) {
      status = "failed";
      code = DECLINE[n];
      message = `البنك رفض العملية (${code})`;
    } else if (!luhn(n)) {
      status = "failed";
      code = "invalid_number";
      message = "رقم البطاقة غير صحيح — فشل فحص Luhn";
    } else {
      status = "requires_action";
      code = "requires_action";
      message = "البنك طلب تحقق إضافي (3-D Secure)";
    }

    intents.set(reference, { amount, status, createdAt: Date.now() });
    return json(res, status === "failed" ? 402 : 200, {
      ok: status !== "failed",
      status,
      code,
      provider: "mock-backend",
      reference,
      amount,
      last4: n.slice(-4),
      message,
    });
  }
  if (path === "/api/pay/confirm" && method === "POST") {
    const { reference, code } = await readBody(req);
    const it = intents.get(reference);
    if (!it) return json(res, 404, { ok: false, status: "failed", reference, message: "العملية غير موجودة" });
    if (it.status === "succeeded") return json(res, 200, { ok: true, status: "succeeded", reference, message: "مؤكدة سابقًا" });
    const c = String(code ?? "");
    if (!/^\d{6}$/.test(c) || c === "000000")
      return json(res, 401, { ok: false, status: "requires_action", reference, message: "رمز التحقق غير صحيح" });
    intents.set(reference, { ...it, status: "succeeded" });
    return json(res, 200, { ok: true, status: "succeeded", reference, amount: it.amount, message: "تم التحقق من البنك ✅" });
  }

  return json(res, 404, { error: `مسار غير معروف: ${method} ${path}` });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[mock-backend] شغال على http://0.0.0.0:${PORT}`);
  console.log(`[mock-backend] حط BACKEND_URL=http://127.0.0.1:${PORT} في .env.local`);
});
