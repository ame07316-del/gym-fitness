/**
 * `npm run db:check` — دكتور الداتابيز.
 *
 * بيجاوب على السؤال الوحيد المهم: «هل الربط تمام ولا فيه إيه؟»
 *   1. الرابط جاي منين وشكله إيه (مزوّد / درايفر / pooler)
 *   2. الاتصال شغال؟ + نسخة Postgres
 *   3. الجداول التلاتة موجودة؟ وكام صف في كل واحد؟
 *   4. فحص خصوصية: أعمدة جدول الدفع + إن مفيش رقم كارت كامل متخزّن
 *   5. لو فيه مشكلة → السبب والحل بالعربي
 */
import { c, connect, describeUrl, explainError, fail, info, ok, requireUrl, warn } from "./lib/db-connect.mjs";

const url = requireUrl("db:check");
const d = describeUrl(url);
const source = process.env.DATABASE_URL ? "DATABASE_URL" : "POSTGRES_URL";

console.log(`\n${c.bold("فحص الداتابيز")}\n`);
info(`الرابط من: ${source}`);
info(`المزوّد: ${c.bold(d.provider)} · الدرايفر: ${c.bold(d.driver)} · الوضع: ${d.mode}`);
info(`الخادم: ${d.host}:${d.port} · قاعدة: ${d.db} · يوزر: ${d.user}`);

if (d.supavisor && d.port === "5432") {
  warn("انت على الـ session pooler (5432) — تمام للمايجريشن، بس للتشغيل على Vercel استخدم الـ transaction pooler (6543).");
}
if (d.host.startsWith("db.") && d.host.endsWith(".supabase.co")) {
  warn("دي الـ Direct connection بتاعة سوبابيز (IPv6 بس) — مش هتشتغل على Vercel. استخدم الـ pooler.");
}

const conn = await connect(url);
let bad = false;

try {
  const t0 = Date.now();
  const [{ version, now }] = [...(await conn.query("select version() as version, now() as now"))];
  ok(`الاتصال شغال في ${Date.now() - t0}ms — ${String(version).split(",")[0]}`);
  info(`وقت السيرفر: ${new Date(now).toISOString()}`);

  const tables = [...(await conn.query(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name in ('bookings','subscriptions','payments')`,
  ))].map((r) => r.table_name);

  const missing = ["bookings", "subscriptions", "payments"].filter((t) => !tables.includes(t));
  if (missing.length) {
    fail(`جداول ناقصة: ${missing.join(" · ")}`);
    warn(`شغّل: ${c.cyan("npm run db:migrate")}`);
    bad = true;
  } else {
    ok("الجداول التلاتة موجودة: bookings · subscriptions · payments");

    const [counts] = [...(await conn.query(
      `select (select count(*) from bookings)::int as bookings,
              (select count(*) from subscriptions)::int as subscriptions,
              (select count(*) from payments)::int as payments,
              (select coalesce(sum(total), 0)::float8 from subscriptions) as revenue`,
    ))];
    info(`الصفوف: حجوزات ${counts.bookings} · اشتراكات ${counts.subscriptions} · مدفوعات ${counts.payments} · إيراد ${Math.round(counts.revenue)} ج.م`);
    if (counts.bookings + counts.subscriptions + counts.payments === 0) {
      info(`الجداول فاضية — جرّب ${c.cyan("npm run db:seed")} أو اعمل حجز من الموقع.`);
    }

    // فحص الخصوصية: أعمدة الدفع
    const cols = [...(await conn.query(
      `select column_name, character_maximum_length as len from information_schema.columns where table_name = 'payments'`,
    ))];
    const names = cols.map((r) => r.column_name);
    const forbidden = names.filter((n) => /(^|_)(pan|card_number|cvv|cvc|exp|holder)($|_)/i.test(n));
    const last4 = cols.find((r) => r.column_name === "last4");
    if (forbidden.length) {
      fail(`أعمدة ممنوعة في جدول الدفع: ${forbidden.join(" · ")}`);
      bad = true;
    } else if (!last4 || Number(last4.len) !== 4) {
      warn("عمود last4 مش موجود أو مقاسه مش 4 — راجع السكيما.");
    } else {
      ok("خصوصية الدفع تمام: brand + last4(4) بس — مفيش عمود لرقم كارت أو CVV.");
    }

    const [longs] = [...(await conn.query(`select count(*)::int as n from payments where last4 is not null and length(last4) > 4`))];
    if (longs.n > 0) {
      fail(`فيه ${longs.n} صف فيه last4 أطول من 4 خانات!`);
      bad = true;
    }

    // المايجريشن المتنفّذة
    try {
      const applied = [...(await conn.query(`select count(*)::int as n from drizzle.__drizzle_migrations`))];
      ok(`المايجريشن المتنفّذة: ${applied[0].n}`);
    } catch {
      warn("مفيش جدول تتبّع للمايجريشن (drizzle.__drizzle_migrations) — يمكن الجداول اتعملت بـ db:push.");
    }
  }
} catch (err) {
  const { msg, hints } = explainError(err, url);
  fail(`فشل: ${msg}`);
  for (const h of hints) warn(h);
  if (!hints.length) console.error(err);
  bad = true;
} finally {
  await conn.end();
}

console.log("");
if (bad) {
  fail("فيه حاجة محتاجة تتظبط — شوف الملاحظات فوق.");
  process.exitCode = 1;
} else {
  ok(c.bold("كله تمام — الموقع هيخزّن في الداتابيز دي. شغّل npm run dev واعمل حجز، وافتح /admin."));
}
