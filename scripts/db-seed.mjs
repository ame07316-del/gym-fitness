/**
 * `npm run db:seed` — بيانات تجريبية واقعية عشان لوحة `/admin` ما تبقاش فاضية
 * في الديمو (٧ أيام من الحجوزات والاشتراكات والمدفوعات).
 *
 * آمن للتكرار: كل الصفوف بمفاتيح ثابتة (`DEMO-…`) و`on conflict do update`،
 * فتشغيله ١٠ مرات = نفس الصفوف مش عشرة أضعاف.
 * ولمسحها: `npm run db:seed -- --clear`
 *
 * ⚠️ زي كل حاجة في المشروع: مفيش رقم كارت — آخر ٤ أرقام والشبكة بس.
 */
import { c, connect, describeUrl, explainError, fail, info, ok, requireUrl } from "./lib/db-connect.mjs";

const url = requireUrl("db:seed");
const clear = process.argv.includes("--clear");
const d = describeUrl(url);
const DAY = 86_400_000;
const at = (daysAgo, hour = 12) => new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10) + `T${String(hour).padStart(2, "0")}:30:00Z`;

const bookings = [
  ["DEMO-BK-1", "أحمد سمير", "01099998888", "تنشيف وتقسيم", "٤ – ٨ بالليل", "برو", "confirmed", at(0, 11)],
  ["DEMO-BK-2", "منى خالد", "01012345678", "تخسيس وحرق دهون", "٦ – ٩ الصبح", "أساسي", "confirmed", at(0, 9)],
  ["DEMO-BK-3", "كريم عادل", "01155554444", "تجهيز لبطولة", "٤ – ٨ بالليل", "VIP إليت", "pending", at(1, 19)],
  ["DEMO-BK-4", "سارة محمود", "01277776666", "لياقة عامة وصحة", "١٢ – ٤ الضهر", "برو", "confirmed", at(2, 13)],
  ["DEMO-BK-5", "محمد الشناوي", "01033332222", "تخسيس وحرق دهون", "٦ – ٩ الصبح", "أساسي", "confirmed", at(4, 8)],
  ["DEMO-BK-6", "نورهان فتحي", "01566667777", "بناء عضلات", "٤ – ٨ بالليل", "برو", "pending", at(6, 20)],
];

const subscriptions = [
  ["DEMO-FZ-1", "منى خالد", "01012345678", "تخسيس", "pro", "برو", "quarterly", 3, ["coach", "nutrition"], "FIT10", "card", 2870, 956, at(0, 10), 90, "active"],
  ["DEMO-FZ-2", "كريم عادل", "01155554444", "تجهيز لبطولة", "vip", "VIP إليت", "yearly", 12, ["recovery"], null, "wallet", 15000, 1250, at(1, 18), 365, "active"],
  ["DEMO-FZ-3", "أحمد سمير", "01099998888", "تنشيف", "pro", "برو", "monthly", 1, [], null, "card", 900, 900, at(2, 12), 30, "active"],
  ["DEMO-FZ-4", "سارة محمود", "01277776666", "لياقة عامة", "basic", "أساسي", "quarterly", 3, ["inbody"], "NEW25", "install", 1485, 495, at(4, 15), 90, "active"],
  ["DEMO-FZ-5", "محمد الشناوي", "01033332222", "تخسيس", "basic", "أساسي", "monthly", 1, [], null, "cash", 500, 500, at(6, 17), 30, "expired"],
];

const payments = [
  ["DEMO-pi-1", "DEMO-FZ-1", 2870, "card", "succeeded", "visa", "4242", "succeeded", at(0, 10)],
  ["DEMO-pi-2", "DEMO-FZ-2", 15000, "wallet", "succeeded", "wallet", null, "succeeded", at(1, 18)],
  ["DEMO-pi-3", "DEMO-FZ-3", 900, "card", "succeeded", "mastercard", "4444", "succeeded", at(2, 12)],
  ["DEMO-pi-4", null, 1200, "card", "failed", "visa", "0002", "card_declined", at(3, 21)],
  ["DEMO-pi-5", "DEMO-FZ-4", 1485, "install", "succeeded", "install", null, "succeeded", at(4, 15)],
  ["DEMO-pi-6", null, 700, "card", "requires_action", "mada", "1234", "requires_action", at(5, 14)],
  ["DEMO-pi-7", "DEMO-FZ-5", 500, "cash", "succeeded", "cash", null, "succeeded", at(6, 17)],
];

const conn = await connect(url);
try {
  if (clear) {
    for (const t of ["payments", "subscriptions", "bookings"]) {
      await conn.query(`delete from ${t} where ${t === "payments" ? "reference" : t === "subscriptions" ? "order_id" : "client_ref"} like 'DEMO-%'`);
    }
    ok("اتمسحت بيانات الديمو (اللي بادئة بـ DEMO-) — بيانات الموقع الحقيقية ما اتلمستش.");
    process.exit(0);
  }

  console.log(`\n${c.bold("زرع بيانات تجريبية")}  ${c.dim(`(${d.provider} · ${d.host})`)}\n`);

  for (const [ref, name, phone, goal, slot, plan, status, created] of bookings) {
    await conn.query(
      `insert into bookings (client_ref, name, phone, goal, slot, plan, status, created_at)
       values ($1,$2,$3,$4,$5,$6,$7::booking_status,$8::timestamptz)
       on conflict (client_ref) do update set name = excluded.name, status = excluded.status, created_at = excluded.created_at`,
      [ref, name, phone, goal, slot, plan, status, created],
    );
  }
  ok(`حجوزات: ${bookings.length}`);

  for (const [id, mName, mPhone, mGoal, planId, planName, cycle, months, addons, coupon, pay, total, perMonth, created, days, status] of subscriptions) {
    const ends = new Date(new Date(created).getTime() + days * DAY).toISOString();
    await conn.query(
      `insert into subscriptions (order_id, member_name, member_phone, member_goal, plan_id, plan_name, cycle, months,
                                  addon_ids, coupon, payment, total, per_month, starts_at, ends_at, status, auto_renew, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::text::jsonb,$10,$11,$12,$13,$14::timestamptz,$15::timestamptz,$16::subscription_status,true,$14::timestamptz)
       on conflict (order_id) do update set total = excluded.total, status = excluded.status,
                                           addon_ids = excluded.addon_ids, created_at = excluded.created_at`,
      [id, mName, mPhone, mGoal, planId, planName, cycle, months, JSON.stringify(addons), coupon, pay, total, perMonth, created, ends, status],
    );
  }
  ok(`اشتراكات: ${subscriptions.length}`);

  for (const [ref, orderId, amount, method, status, brand, last4, code, created] of payments) {
    await conn.query(
      `insert into payments (reference, order_id, amount, method, status, brand, last4, error_code, created_at, updated_at)
       values ($1,$2,$3,$4,$5::payment_status,$6,$7,$8,$9::timestamptz,$9::timestamptz)
       on conflict (reference) do update set status = excluded.status, amount = excluded.amount, created_at = excluded.created_at`,
      [ref, orderId, amount, method, status, brand, last4, code, created],
    );
  }
  ok(`مدفوعات: ${payments.length} (آخر ٤ أرقام بس)`);

  info(`افتح ${c.cyan("/admin")} (باسورد التطوير: admin123) — المفروض تلاقي إيراد ورسم آخر ٧ أيام.`);
  info(`لمسحها بعدين: ${c.cyan("npm run db:seed -- --clear")}`);
} catch (err) {
  const { msg, hints } = explainError(err, url);
  fail(`الزرع فشل: ${msg}`);
  for (const h of hints) console.log(`  ${h}`);
  if (!hints.length) console.error(err);
  process.exitCode = 1;
} finally {
  await conn.end();
}
