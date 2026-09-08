import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة الإدارة — FitZone Pro",
  description: "إحصائيات الاشتراكات والحجوزات والمدفوعات",
  robots: { index: false, follow: false },
};

/** غلاف عام للوحة الإدارة — الحماية نفسها في proxy.ts + كل route handler */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-ink text-white selection:bg-brand">{children}</div>;
}
