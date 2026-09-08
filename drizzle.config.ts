import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

/**
 * إعدادات drizzle-kit (المايجريشن).
 *
 *   npm run db:generate   # يقرأ السكيما ويكتب SQL جديد في drizzle/
 *   npm run db:migrate    # ينفّذ الملفات اللي لسه ماتنفّذتش على DATABASE_URL
 *   npm run db:studio     # واجهة تصفح للجداول
 *
 * الملف ده بيقرأ `.env.local` بنفسه لأن drizzle-kit مش بيمر على Next
 * (وNext هو اللي بيحمّل .env.local للتطبيق نفسه).
 */
function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
      if (!m || line.trim().startsWith("#")) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (value && !process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    // مفيش ملف بيئة — عادي، الاكتشاف من متغيرات النظام
  }
}

for (const file of [".env.local", ".env"]) loadEnv(file);

export default defineConfig({
  schema: "./app/lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "" },
  strict: true,
  verbose: true,
});
