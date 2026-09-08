import { NextResponse } from "next/server";
import { db } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/admin-guard";
import { csvResponse, matches, paginate, parseListQuery, stamp, toCsv } from "@/app/lib/server/admin-list";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders?q=&status=&page=&per=&format=csv
 * الاشتراكات: بحث بالاسم/الموبايل/رقم الطلب/الباقة/الكوبون + فلترة بالحالة + CSV.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const query = parseListQuery(request.url);
  const rows = db.orders.filter(
    (o) =>
      (!query.status || o.status === query.status) &&
      matches(query.q, o.orderId, o.member.name, o.member.phone, o.planName, o.coupon, o.payment, o.cycle),
  );

  if (query.format === "csv") {
    return csvResponse(
      `fitzone-orders-${stamp(Date.now()).slice(0, 10)}.csv`,
      toCsv(
        ["رقم الطلب", "الاسم", "الموبايل", "الباقة", "المدة", "شهور", "إضافات", "كوبون", "طريقة الدفع", "الإجمالي", "شهريًا", "الحالة", "تجديد تلقائي", "تاريخ الطلب", "ينتهي في"],
        rows.map((o) => [
          o.orderId,
          o.member.name,
          o.member.phone,
          o.planName,
          o.cycle,
          o.months,
          o.addonIds.join(" | "),
          o.coupon ?? "",
          o.payment,
          o.total,
          o.perMonth,
          o.status,
          o.autoRenew ? "نعم" : "لا",
          stamp(o.createdAt),
          stamp(o.endsAt),
        ]),
      ),
    );
  }

  return NextResponse.json({ ok: true, ...paginate(rows, query) });
}
