import { authorize, scopeCoachId } from "@/app/lib/auth/guard";
import { can } from "@/app/lib/auth/roles";
import { listBookings, type BookingStatus } from "@/app/lib/db/bookings";
import { listCoaches } from "@/app/lib/db/users";
import { json } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES = ["all", "pending", "confirmed", "done", "no_show", "cancelled"];

export async function GET(request: Request) {
  const guard = await authorize(request);
  if (!guard.ok) return guard.response;

  const { user } = guard.ctx;
  const scoped = scopeCoachId(guard.ctx);
  if (!can(user.role, "bookings:read") && !can(user.role, "bookings:read:own")) {
    return json({ error: "الصلاحية دي مش متاحة لدورك" }, { status: 403 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status = STATUSES.includes(statusParam ?? "") ? (statusParam as BookingStatus | "all") : "all";

  const { items, total, pending } = listBookings({
    coachId: scoped,
    status,
    limit: Number(url.searchParams.get("limit") ?? 50),
    offset: Number(url.searchParams.get("offset") ?? 0),
  });

  return json({
    ok: true,
    total,
    pending,
    scope: scoped ? "own" : "all",
    coaches: can(user.role, "bookings:update") ? listCoaches() : [],
    items,
  });
}
