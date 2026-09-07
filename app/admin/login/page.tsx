import { redirect } from "next/navigation";
import { currentSession } from "@/app/lib/auth/server";
import { DEMO_ACCOUNTS } from "@/app/lib/db/seed";
import LoginForm from "../components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await currentSession();
  const { next } = await searchParams;
  // مسار العودة لازم يكون داخلي — منع open redirect
  const target = next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  if (session) redirect(target);

  return <LoginForm next={target} demoAccounts={DEMO_ACCOUNTS} />;
}
