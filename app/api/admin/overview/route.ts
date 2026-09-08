import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/server/admin-guard";
import { getRepo } from "@/app/lib/server/db";
import { buildOverview } from "@/app/lib/server/admin-stats";

export const dynamic = "force-dynamic";

/**
 * أرقام لوحة الإدارة: إيراد، اشتراكات، حجوزات، مدفوعات، آخر 7 أيام.
 * `storage` زيادة على شكل `AdminOverview` — عشان اللوحة تعرض التخزين الشغال
 * (Postgres/Supabase ولا الذاكرة) من غير ما تلمس شكل العقد نفسه.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const repo = await getRepo();
  return NextResponse.json({
    ok: true,
    ...(await buildOverview()),
    storage: { kind: repo.kind, label: repo.label },
  });
}
