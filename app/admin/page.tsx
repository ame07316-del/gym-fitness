import { redirect } from "next/navigation";
import { currentSession } from "@/app/lib/auth/server";
import { ROLE_PERMISSIONS } from "@/app/lib/auth/roles";
import Dashboard from "./components/Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await currentSession();
  if (!session) redirect("/admin/login");

  const { user } = session;
  return <Dashboard user={user} permissions={[...ROLE_PERMISSIONS[user.role]]} />;
}
