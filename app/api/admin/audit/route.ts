import { authorize } from "@/app/lib/auth/guard";
import { listAudit } from "@/app/lib/db/audit";
import { json } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** سجل العمليات — مين عمل إيه وإمتى (للمدير العام ومدير الفرع) */
export async function GET(request: Request) {
  const guard = await authorize(request, "audit:read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const { items, total } = listAudit(Number(url.searchParams.get("limit") ?? 100), Number(url.searchParams.get("offset") ?? 0));

  return json({ ok: true, total, items });
}
