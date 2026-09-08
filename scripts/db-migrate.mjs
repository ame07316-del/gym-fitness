/**
 * `npm run db:migrate` — بينفّذ المايجريشن اللي في مجلد `drizzle/` على `DATABASE_URL`.
 *
 * ليه سكربت بدل `drizzle-kit migrate`؟
 *   - بيشتغل على **أي** وصلة سوبابيز (حتى الـ transaction pooler بورت 6543) لأنه
 *     بيفتح الكونكشن بـ `prepare: false`.
 *   - بيختار الدرايفر زي التطبيق بالظبط (Neon HTTP / postgres.js).
 *   - بيطلع رسائل مفهومة بالعربي بدل stack trace.
 */
import { c, connect, describeUrl, explainError, fail, info, ok, requireUrl, warn } from "./lib/db-connect.mjs";

const url = requireUrl("db:migrate");
const d = describeUrl(url);

console.log(`\n${c.bold("تنفيذ المايجريشن")}  ${c.dim(`(${d.provider} · ${d.driver} · ${d.host}:${d.port} · ${d.mode})`)}\n`);

const conn = await connect(url);
try {
  const { db, migrate } = await conn.drizzle();
  await migrate(db, { migrationsFolder: "drizzle" });
  ok("المايجريشن اتنفّذت بنجاح.");

  const rows = await conn.query(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name in ('bookings','subscriptions','payments') order by table_name`,
  );
  const names = [...rows].map((r) => r.table_name);
  if (names.length === 3) ok(`الجداول موجودة: ${names.join(" · ")}`);
  else warn(`الجداول الموجودة: ${names.join(" · ") || "مفيش"} — المفروض 3.`);

  info(`الخطوة اللي بعدها: ${c.cyan("npm run db:check")} للتأكد، أو ${c.cyan("npm run db:seed")} لبيانات تجريبية.`);
} catch (err) {
  const { msg, hints } = explainError(err, url);
  fail(`المايجريشن فشلت: ${msg}`);
  for (const h of hints) warn(h);
  if (!hints.length) console.error(err);
  process.exitCode = 1;
} finally {
  await conn.end();
}
