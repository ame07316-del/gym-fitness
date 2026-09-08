import { NextResponse } from "next/server";
import { getRepo, LIST_MAX } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/admin-guard";
import { csvResponse, matches, paginate, parseListQuery, stamp, toCsv } from "@/app/lib/server/admin-list";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/payments?q=&status=&page=&per=&format=csv
 * سجل عمليات الدفع (المرجع، آخر 4 أرقام، النوع، الحالة، كود الرفض) — بدون أي بيانات كارت كاملة.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const query = parseListQuery(request.url);
  // الأدابتر بيرجّع الأحدث الأول (ORDER BY created_at DESC في Postgres)
  const rows = (await (await getRepo()).listPayments(LIST_MAX)).filter(
    (p) => (!query.status || p.status === query.status) && matches(query.q, p.reference, p.last4, p.brand, p.method, p.code, p.amount),
  );

  if (query.format === "csv") {
    return csvResponse(
      `fitzone-payments-${stamp(Date.now()).slice(0, 10)}.csv`,
      toCsv(
        ["المرجع", "المبلغ", "الطريقة", "الشبكة", "آخر 4", "الحالة", "الكود", "التاريخ", "آخر تحديث"],
        rows.map((p) => [p.reference, p.amount, p.method, p.brand, p.last4, p.status, p.code, stamp(p.createdAt), stamp(p.updatedAt)]),
      ),
    );
  }

  return NextResponse.json({ ok: true, ...paginate(rows, query) });
}
