import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // السماح لمعاينة التطوير (host proxy خارجي) بالحصول على أصول الـ dev server
  allowedDevOrigins: ["*.e2b.app", "**.e2b.app", "localhost"],
  images: {
    // الصور كلها محلية داخل /public — لا حاجة لأي نطاق خارجي
    qualities: [60, 75, 85],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
