import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة الإدارة — FitZone Pro",
  description: "إدارة الاشتراكات والحجوزات والمستخدمين",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-ink text-white">{children}</div>;
}
