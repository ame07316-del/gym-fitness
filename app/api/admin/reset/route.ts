import { NextResponse } from "next/server";
import { getRepo } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/admin-guard";

export const dynamic = "force-dynamic";

/** POST /api/admin/reset — only disposable in-memory demo data may be erased here. */
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const repo = await getRepo();
  // A sandbox *payment* flag does not mean a connected Postgres database is disposable.
  if (repo.kind !== "memory") {
    return NextResponse.json({ error: "مسح الداتابيز الحقيقية غير متاح من الموقع", code: "forbidden" }, { status: 403 });
  }

  await repo.reset();
  return NextResponse.json({ ok: true, message: "اتمسحت بيانات وضع التجربة" });
}
