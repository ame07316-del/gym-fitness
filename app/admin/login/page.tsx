import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

/** صفحة دخول الأدمن — الفورم client component (بيستخدم useSearchParams) فمحتاج Suspense */
export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="grid-noise pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="pointer-events-none absolute -top-40 right-1/2 h-[480px] w-[480px] translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" aria-hidden />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
