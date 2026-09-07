import type { MetadataRoute } from "next";

const base = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://fitzone.pro").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    // لوحة الإدارة مش المفروض تتفهرس أبدًا
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/admin/"] }],
    sitemap: `${base()}/sitemap.xml`,
  };
}
