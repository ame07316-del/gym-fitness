import { NextResponse } from "next/server";
import { resetDb } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/admin-guard";

export const dynamic = "force-dynamic";

/** POST /api/admin/reset — مسح بيانات وضع التجربة (متاح في الـ sandbox بس) */
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const sandbox = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "sandbox") === "sandbox";
  if (!sandbox) {
    return NextResponse.json({ error: "المسح متاح في وضع التجربة بس — في الإنتاج البيانات في الداتابيز", code: "forbidden" }, { status: 403 });
  }

  await resetDb();
  return NextResponse.json({ ok: true, message: "اتمسحت بيانات وضع التجربة" });
}
