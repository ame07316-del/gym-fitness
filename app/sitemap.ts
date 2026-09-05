import type { MetadataRoute } from "next";

const ANCHORS = [
  "plans",
  "trainers",
  "schedule",
  "gallery",
  "tools",
  "success",
  "reviews",
  "faq",
  "booking",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://fitzone.pro").replace(/\/+$/, "");
  const lastModified = new Date();
  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    ...ANCHORS.map((id) => ({
      url: `${base}/#${id}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
