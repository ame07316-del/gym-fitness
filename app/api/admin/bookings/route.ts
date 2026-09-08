import { NextResponse } from "next/server";
import { db } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/admin-guard";
import { csvResponse, matches, paginate, parseListQuery, stamp, toCsv } from "@/app/lib/server/admin-list";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/bookings?q=&status=&page=&per=&format=csv
 * قائمة الحجوزات مع بحث (اسم/موبايل/هدف/كود) وفلترة بالحالة وتصدير CSV.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const query = parseListQuery(request.url);
  const rows = db.bookings.filter(
    (b) => (!query.status || b.status === query.status) && matches(query.q, b.id, b.name, b.phone, b.goal, b.slot, b.plan),
  );

  if (query.format === "csv") {
    return csvResponse(
      `fitzone-bookings-${stamp(Date.now()).slice(0, 10)}.csv`,
      toCsv(
        ["الكود", "الاسم", "الموبايل", "الهدف", "الوقت المفضل", "الباقة", "الحالة", "التاريخ"],
        rows.map((b) => [b.id, b.name, b.phone, b.goal, b.slot, b.plan, b.status, stamp(b.createdAt)]),
      ),
    );
  }

  return NextResponse.json({ ok: true, ...paginate(rows, query) });
}
