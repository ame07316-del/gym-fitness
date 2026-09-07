import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// اختبارات لمنطق بيزنس صافي (محرك الأسعار + التحقق من الكروت + الـ validators)
// + اختبارات صلاحيات وأمان بتشتغل على قاعدة SQLite في الذاكرة: `npm test`
export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      // كل ملف اختبار بياخد قاعدة بيانات نضيفة في الذاكرة
      DATABASE_PATH: ":memory:",
      DEMO_SEED: "1",
    },
  },
});
