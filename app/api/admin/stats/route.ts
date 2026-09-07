import { authorize, scopeCoachId } from "@/app/lib/auth/guard";
import { can } from "@/app/lib/auth/roles";
import { bookingStats } from "@/app/lib/db/bookings";
import { expireOverdue, subscriptionStats } from "@/app/lib/db/subscriptions";
import { listUsers } from "@/app/lib/db/users";
import { json } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** أرقام الدشبورد — الإيراد بيظهر بس للأدوار اللي معاها revenue:read */
export async function GET(request: Request) {
  const guard = await authorize(request, "dashboard:view");
  if (!guard.ok) return guard.response;

  expireOverdue();

  const scoped = scopeCoachId(guard.ctx);
  const subs = subscriptionStats(scoped);
  const books = bookingStats(scoped);
  const showMoney = can(guard.ctx.user.role, "revenue:read");

  const staff = can(guard.ctx.user.role, "users:read")
    ? (() => {
        const users = listUsers();
        return {
          total: users.length,
          active: users.filter((u) => u.active).length,
          coaches: users.filter((u) => u.role === "coach").length,
        };
      })()
    : null;

  return json({
    ok: true,
    scope: scoped ? "own" : "all",
    subscriptions: {
      total: subs.total,
      active: subs.active,
      frozen: subs.frozen,
      cancelled: subs.cancelled,
      expired: subs.expired,
      byPlan: subs.byPlan,
      revenue: showMoney ? subs.revenue : null,
    },
    bookings: books,
    staff,
  });
}
