import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// اختبارات لمنطق بيزنس صافي (محرك الأسعار + التحقق من الكروت + الـ validators) —
// من غير متصفح، من غير داتابيز: `npm test`
export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // اختبارات العقد لازم تشتغل على أدابتر الذاكرة حتى لو المطوّر حاطط DATABASE_URL في بيئته.
    // أدابتر Postgres بيتختبر لوحده في tests/db-adapter.test.ts فوق PGlite.
    env: { DATABASE_URL: "", POSTGRES_URL: "" },
  },
});
