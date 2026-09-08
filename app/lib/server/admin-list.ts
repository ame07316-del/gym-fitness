/**
 * أدوات مشتركة لقوائم لوحة الإدارة: بحث + فلترة + ترقيم صفحات + تصدير CSV.
 * كلها صافية وبتشتغل على مصفوفات في الذاكرة — لما تيجي الداتابيز تتبدل بـ WHERE/LIMIT.
 */
export type ListQuery = { q: string; status: string; page: number; per: number; format: "json" | "csv" };

export function parseListQuery(url: string): ListQuery {
  const sp = new URL(url).searchParams;
  const per = Math.max(5, Math.min(100, Number(sp.get("per")) || 20));
  const page = Math.max(1, Number(sp.get("page")) || 1);
  return {
    q: (sp.get("q") ?? "").trim().toLowerCase(),
    status: (sp.get("status") ?? "").trim(),
    page,
    per,
    format: sp.get("format") === "csv" ? "csv" : "json",
  };
}

/** بحث حر: بيطابق أي حقل من الحقول المختارة (عربي/إنجليزي/أرقام) */
export function matches(q: string, ...fields: Array<string | number | null | undefined>) {
  if (!q) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(q));
}

export function paginate<T>(rows: T[], { page, per }: ListQuery) {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / per));
  const safePage = Math.min(page, pages);
  return {
    items: rows.slice((safePage - 1) * per, safePage * per),
    page: safePage,
    pages,
    per,
    total,
  };
}

/** CSV بـ BOM عشان Excel يفتح العربي صح، وكل خلية بتتهرّب */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    // منع حقن الصيغ في Excel (=SUM…) — بنسبقها بـ '
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function csvResponse(filename: string, body: string) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const stamp = (ts: number) => new Date(ts).toISOString().replace("T", " ").slice(0, 16);
