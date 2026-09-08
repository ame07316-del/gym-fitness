/**
 * أدوات مشتركة لسكربتات الداتابيز (`db:migrate` · `db:check` · `db:seed`).
 *
 * بتعمل نفس اللي بيعمله التطبيق بالظبط: بتقرا `DATABASE_URL` من `.env.local`،
 * وتختار الدرايفر من شكل الـ URL (Neon = HTTP · أي بوستجرس تاني = postgres.js)،
 * وتفتح كونكشن واحد بإعدادات آمنة مع Supavisor (`prepare: false`).
 *
 * مكتوبة JS خالص عشان تتشغّل بـ `node` من غير build ولا ts-node.
 */
import { readFileSync } from "node:fs";

const RESET = "\u001b[0m";
export const c = {
  bold: (s) => `\u001b[1m${s}${RESET}`,
  dim: (s) => `\u001b[2m${s}${RESET}`,
  red: (s) => `\u001b[31m${s}${RESET}`,
  green: (s) => `\u001b[32m${s}${RESET}`,
  yellow: (s) => `\u001b[33m${s}${RESET}`,
  cyan: (s) => `\u001b[36m${s}${RESET}`,
};

export const ok = (s) => console.log(`${c.green("✓")} ${s}`);
export const info = (s) => console.log(`${c.cyan("•")} ${s}`);
export const warn = (s) => console.log(`${c.yellow("!")} ${s}`);
export const fail = (s) => console.log(`${c.red("✗")} ${s}`);

/** قراءة ملفات البيئة (Next بيقراها للتطبيق، بس السكربتات لأ) */
export function loadEnvFiles(files = [".env.local", ".env"]) {
  for (const file of files) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (line.trim().startsWith("#")) continue;
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
        if (!m) continue;
        const value = m[2].trim().replace(/^["']|["']$/g, "");
        if (value && !process.env[m[1]]) process.env[m[1]] = value;
      }
    } catch {
      // الملف مش موجود — عادي
    }
  }
}

export function databaseUrl() {
  return (process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "").trim();
}

export function urlParts(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname.toLowerCase(), port: u.port || "5432", user: decodeURIComponent(u.username), db: u.pathname.slice(1) };
  } catch {
    return { host: "", port: "", user: "", db: "" };
  }
}

export function pickDriver(url, override = process.env.DATABASE_DRIVER) {
  const forced = (override ?? "").trim().toLowerCase();
  if (forced.startsWith("neon")) return "neon-http";
  if (forced) return "postgres-js";
  const { host } = urlParts(url);
  return host.endsWith(".neon.tech") || host.endsWith(".neon.build") ? "neon-http" : "postgres-js";
}

/** وصف بشري للوصلة — بيظهر في نتيجة السكربتات */
export function describeUrl(url) {
  const { host, port, user, db } = urlParts(url);
  const driver = pickDriver(url);
  let provider = "Postgres";
  if (host.endsWith(".neon.tech") || host.endsWith(".neon.build")) provider = "Neon";
  else if (host.includes("supabase")) provider = "Supabase";
  else if (host === "localhost" || host === "127.0.0.1") provider = "Postgres محلي";

  const supavisor = host.includes("pooler.supabase.com");
  const mode = supavisor ? (port === "6543" ? "transaction pooler" : "session pooler") : host.includes("-pooler.") ? "pooled" : "direct";
  return { provider, driver, host, port, user, db, mode, supavisor };
}

/** رسالة خطأ مفهومة بدل stack trace */
export function explainError(err, url) {
  const msg = String(err?.message ?? err);
  const { host, port } = urlParts(url);
  const hints = [];

  if (/\[YOUR-PASSWORD\]|YOUR-PASSWORD|PASSWORD@/i.test(url)) {
    hints.push("الرابط لسه فيه العبارة الافتراضية للباسورد — بدّلها بباسورد الداتابيز الحقيقي.");
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(msg)) {
    hints.push(`الـ host مش بيتحل: ${host} — راجع نسخ الرابط (أو النت عندك).`);
  }
  if (/ENETUNREACH|EHOSTUNREACH/i.test(msg)) {
    hints.push("الشبكة مش واصلة للسيرفر. لو ده Supabase Direct connection (db.xxx.supabase.co) فهو IPv6 بس — استخدم الـ pooler (aws-0-...pooler.supabase.com).");
  }
  if (/ECONNREFUSED/i.test(msg)) hints.push(`مفيش حاجة سامعة على ${host}:${port}.`);
  if (/password authentication failed|SASL|SCRAM/i.test(msg)) hints.push("الباسورد غلط — من Supabase: Settings ← Database ← Reset database password.");
  if (/Tenant or user not found/i.test(msg)) hints.push("مع pooler سوبابيز اليوزر لازم يكون بالشكل postgres.PROJECT_REF (مش postgres لوحده).");
  if (/self.signed|certificate|SSL|TLS/i.test(msg)) hints.push("مشكلة TLS — جرّب تضيف ?sslmode=require في آخر الرابط.");
  if (/relation .* does not exist/i.test(msg)) hints.push("الجداول مش موجودة — شغّل: npm run db:migrate");
  if (/prepared statement .* already exists/i.test(msg)) hints.push("ده الـ transaction pooler — لازم prepare:false (التطبيق بيعملها لوحده؛ لو الخطأ من أداة تانية استخدم بورت 5432).");

  return { msg, hints };
}

/**
 * كونكشن موحّد:
 *   query(text, params) → صفوف
 *   drizzle()           → عميل drizzle (للمايجريشن)
 *   end()               → إقفال
 */
export async function connect(url) {
  const driver = pickDriver(url);

  if (driver === "neon-http") {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    return {
      driver,
      query: (text, params = []) => sql.query(text, params),
      drizzle: async () => {
        const { drizzle } = await import("drizzle-orm/neon-http");
        const { migrate } = await import("drizzle-orm/neon-http/migrator");
        return { db: drizzle(sql), migrate };
      },
      end: async () => {},
    };
  }

  const { default: postgres } = await import("postgres");
  const { host } = urlParts(url);
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const sql = postgres(url, {
    prepare: false, // إجباري مع Supavisor transaction pooler (6543)
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
    ...(/[?&]sslmode=/i.test(url) || isLocal ? {} : { ssl: "require" }),
  });
  return {
    driver,
    query: (text, params = []) => sql.unsafe(text, params),
    drizzle: async () => {
      const { drizzle } = await import("drizzle-orm/postgres-js");
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      return { db: drizzle(sql), migrate };
    },
    end: () => sql.end({ timeout: 5 }),
  };
}

/** بداية موحّدة لكل سكربت: بيحمّل البيئة ويتأكد إن فيه رابط */
export function requireUrl(scriptName) {
  loadEnvFiles();
  const url = databaseUrl();
  if (!url) {
    fail("مفيش DATABASE_URL.");
    console.log(`
${c.bold("المشروع شغال دلوقتي على مخزن الذاكرة (وده مقصود — زيرو إعداد).")}
عشان تربط داتابيز حقيقية:

  1) هات وصلة Postgres:
     • Supabase → Dashboard ← Connect ← ORMs ← Drizzle
     • Neon     → Dashboard ← Connection string (Pooled)
  2) حطها في ملف ${c.cyan(".env.local")} في جذر المشروع:
     ${c.cyan("DATABASE_URL=postgresql://user:password@host:6543/postgres")}
  3) شغّل تاني: ${c.cyan(`npm run ${scriptName}`)}

الدليل خطوة بخطوة: ${c.cyan("docs/SUPABASE-SETUP.md")}
`);
    process.exit(1);
  }
  return url;
}
