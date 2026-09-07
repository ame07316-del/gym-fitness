/**
 * تسعيرة رسمية من السيرفر — **المصدر الوحيد للأسعار**.
 *
 * الواجهة بتحسب نفس الأرقام محليًا عشان العرض يبقى فوري، لكن الرقم اللي بيتحاسب
 * عليه العضو بيتحسب هنا من جديد. أي مبلغ جاي من المتصفح بيتتجاهل تمامًا.
 */
import { hitRateLimit } from "@/app/lib/db/rate-limit";
import { clientIp, errorJson, json, readJson } from "@/app/lib/http";
import { parseDraft, quoteOf } from "@/app/lib/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = hitRateLimit(`quote:${ip}`, { limit: 60, windowMs: 10 * 60_000, blockMs: 5 * 60_000 });
  if (!limit.ok) return errorJson("طلبات كتير من نفس الجهاز — استنى شوية", 429, { retryAfter: limit.retryAfterSeconds });

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const { draft, errors } = parseDraft(body);
  if (Object.keys(errors).length) return json({ error: "بيانات الاشتراك غير صحيحة", fields: errors }, { status: 422 });

  const quote = quoteOf(draft);

  return json({
    ok: true,
    draft,
    quote: {
      planName: quote.planName,
      cycleLabel: quote.cycleLabel,
      months: quote.months,
      subtotal: quote.subtotal,
      cycleDiscount: quote.cycleDiscount,
      couponDiscount: quote.couponDiscount,
      net: quote.net,
      vat: quote.vat,
      total: quote.total,
      perMonth: quote.perMonth,
      coupon: quote.coupon?.code ?? null,
      couponError: quote.couponError,
    },
  });
}
