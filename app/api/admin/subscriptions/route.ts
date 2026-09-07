import { authorize, scopeCoachId } from "@/app/lib/auth/guard";
import { can } from "@/app/lib/auth/roles";
import { expireOverdue, listSubscriptions, maskPhone, type SubStatus } from "@/app/lib/db/subscriptions";
import { listCoaches } from "@/app/lib/db/users";
import { json } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: (SubStatus | "all")[] = ["all", "pending", "active", "frozen", "cancelled", "expired"];

/**
 * قائمة الاشتراكات.
 * — الكوتش بيشوف أعضاءه هو بس (فلترة على السيرفر مش على الواجهة).
 * — الاستقبال بيشوف الاشتراكات من غير الأرقام المالية والتليفون بيتخفي جزئيًا.
 */
export async function GET(request: Request) {
  const guard = await authorize(request);
  if (!guard.ok) return guard.response;

  const { user } = guard.ctx;
  const scoped = scopeCoachId(guard.ctx);
  if (!can(user.role, "subscriptions:read") && !scoped) {
    return json({ error: "الصلاحية دي مش متاحة لدورك" }, { status: 403 });
  }

  expireOverdue();

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status = (STATUSES as string[]).includes(statusParam ?? "") ? (statusParam as SubStatus | "all") : "all";
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 40) || undefined;
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  const { items, total } = listSubscriptions({ coachId: scoped, status, search, limit, offset });
  const showMoney = can(user.role, "revenue:read");
  const showPhone = can(user.role, "subscriptions:update") || user.role === "coach";

  return json({
    ok: true,
    total,
    scope: scoped ? "own" : "all",
    coaches: can(user.role, "subscriptions:update") ? listCoaches() : [],
    items: items.map((s) => ({
      ...s,
      member: { ...s.member, phone: showPhone ? s.member.phone : maskPhone(s.member.phone) },
      total: showMoney ? s.total : null,
      perMonth: showMoney ? s.perMonth : null,
    })),
  });
}
