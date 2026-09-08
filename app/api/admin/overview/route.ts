import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/server/admin-guard";
import { buildOverview } from "@/app/lib/server/admin-stats";

export const dynamic = "force-dynamic";

/** أرقام لوحة الإدارة: إيراد، اشتراكات، حجوزات، مدفوعات، آخر 7 أيام */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ ok: true, ...buildOverview() });
}
