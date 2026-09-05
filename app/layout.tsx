import type { Metadata, Viewport } from "next";
import "@fontsource/cairo/arabic-400.css";
import "@fontsource/cairo/arabic-600.css";
import "@fontsource/cairo/arabic-700.css";
import "@fontsource/cairo/arabic-900.css";
import "@fontsource/cairo/latin-400.css";
import "@fontsource/cairo/latin-700.css";
import "@fontsource/cairo/latin-900.css";
import "./globals.css";
import { GymProvider } from "./lib/store";
import { ToastProvider } from "./components/ui/Toast";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://fitzone.pro"),
  title: "FitZone Pro — جيم ولياقة بدنية | اشتراكات أونلاين",
  description:
    "FitZone Pro: أفخم صالة رياضية في القاهرة. اشترك أونلاين، احجز كلاساتك، واحسب BMI والسعرات مجاناً.",
  keywords: ["جيم", "لياقة", "اشتراك جيم", "كوتش", "كمال أجسام", "تخسيس", "FITZONE"],
  applicationName: "FitZone Pro",
  authors: [{ name: "FitZone Pro" }],
  openGraph: {
    title: "FitZone Pro — حوّل جسمك، غيّر حياتك",
    description: "اشتراكات مرنة، كوتشات محترفين، وحاسبات لياقة مجانية.",
    type: "website",
    locale: "ar_EG",
    images: [{ url: "/images/hero.jpg", width: 1600, height: 900, alt: "FitZone Pro" }],
  },
  twitter: { card: "summary_large_image", title: "FitZone Pro", description: "اشتراكات أونلاين وحاسبات لياقة مجانية" },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <body className="bg-ink text-white antialiased">
        {/* Skip link للكيبورد وقارئ الشاشة — بيظهر أول ما تدوس Tab */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2.5 focus:text-sm focus:font-black focus:text-white"
        >
          تخطَّ إلى المحتوى
        </a>
        <ToastProvider>
          <GymProvider>{children}</GymProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
