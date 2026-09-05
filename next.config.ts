import type { NextConfig } from "next";

/**
 * الوصلة بالباك إند (Laravel / Node / أي حاجة).
 *
 *  BACKEND_URL=http://127.0.0.1:8000           ← بروكسي لكل /api/* على الباك إند (من غير CORS)
 *  BACKEND_ONLY=bookings,subscribe             ← اختياري: بروكسي للمسارات دي بس، والباقي يفضل محلي
 *  NEXT_PUBLIC_API_BASE=https://api.example.com ← بديل: نداءات مباشرة من المتصفح (محتاج CORS)
 *
 * مفيش أي ملف تاني محتاج يتعدّل — الواجهة بتتكلم على /api/* دايمًا.
 */
const BACKEND = (process.env.BACKEND_URL ?? "").replace(/\/+$/, "");
const ONLY = (process.env.BACKEND_ONLY ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function proxyRules() {
  if (!BACKEND) return [];
  if (ONLY.length === 0) return [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }];
  return ONLY.map((p) => ({ source: `/api/${p}`, destination: `${BACKEND}/api/${p}` }));
}

const nextConfig: NextConfig = {
  // السماح لمعاينة التطوير (host proxy خارجي) بالحصول على أصول الـ dev server
  allowedDevOrigins: ["*.e2b.app", "**.e2b.app", "localhost"],
  images: {
    qualities: [60, 75, 85],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
  async rewrites() {
    // beforeFiles علشان الباك إند يكسب على الـ Route Handlers المحلية لما يكون شغال
    return { beforeFiles: proxyRules() };
  },
};

export default nextConfig;
