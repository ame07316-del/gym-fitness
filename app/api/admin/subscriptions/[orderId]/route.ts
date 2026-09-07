import { actorOf, authorize } from "@/app/lib/auth/guard";
import { can } from "@/app/lib/auth/roles";
import { audit } from "@/app/lib/db/audit";
import { assignCoach, deleteSubscription, getSubscription, setSubscriptionStatus, type SubStatus } from "@/app/lib/db/subscriptions";
import { findUserById } from "@/app/lib/db/users";
import { cleanText, errorJson, json, readJson } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** الحركات المسموح بيها وكل واحدة محتاجة صلاحية إيه */
const ACTIONS = {
  cancel: { status: "cancelled" as SubStatus, permission: "subscriptions:cancel" as const, label: "إلغاء الاشتراك" },
  freeze: { status: "frozen" as SubStatus, permission: "subscriptions:update" as const, label: "تجميد الاشتراك" },
  resume: { status: "active" as SubStatus, permission: "subscriptions:update" as const, label: "استئناف الاشتراك" },
  reactivate: { status: "active" as SubStatus, permission: "subscriptions:update" as const, label: "إعادة تفعيل الاشتراك" },
};

type ActionKey = keyof typeof ACTIONS;

/**
 * تعديل اشتراك: إلغاء / تجميد / استئناف / إسناد كوتش.
 * body: { action?: "cancel"|"freeze"|"resume"|"reactivate", reason?: string, coachId?: string|null }
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const guard = await authorize(request);
  if (!guard.ok) return guard.response;

  const { orderId } = await ctx.params;
  const existing = getSubscription(decodeURIComponent(orderId));
  if (!existing) return errorJson("الاشتراك مش موجود", 404);

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const role = guard.ctx.user.role;
  const reason = cleanText(body.reason, 200) || null;
  let updated = existing;
  const done: string[] = [];

  /* ---------- تغيير الحالة ---------- */
  if (body.action !== undefined) {
    const key = String(body.action) as ActionKey;
    const action = ACTIONS[key];
    if (!action) return errorJson("الحركة دي مش معروفة", 400, { allowed: Object.keys(ACTIONS) });
    if (!can(role, action.permission)) return errorJson(`مش مسموح لك تعمل: ${action.label}`, 403, { code: "forbidden" });
    if (existing.status === action.status) return errorJson(`الاشتراك بالفعل ${action.status}`, 409);
    if (key === "cancel" && existing.status === "cancelled") return errorJson("الاشتراك ملغي بالفعل", 409);

    updated = setSubscriptionStatus(existing.orderId, action.status, { id: guard.ctx.user.id, reason })!;
    done.push(action.label);

    audit({
      actor: actorOf(guard.ctx),
      action: "subscription.status_changed",
      entity: "subscription",
      entityId: existing.orderId,
      meta: { from: existing.status, to: action.status, reason },
      ip: guard.ip,
    });
  }

  /* ---------- إسناد كوتش ---------- */
  if (body.coachId !== undefined) {
    if (!can(role, "subscriptions:update")) return errorJson("مش مسموح لك تغيّر الكوتش", 403, { code: "forbidden" });
    const coachId = body.coachId === null || body.coachId === "" ? null : cleanText(body.coachId, 64);
    if (coachId) {
      const coach = findUserById(coachId);
      if (!coach || coach.role !== "coach" || coach.active !== 1) return errorJson("الكوتش ده مش موجود أو موقوف", 422);
    }
    updated = assignCoach(existing.orderId, coachId)!;
    done.push(coachId ? "إسناد كوتش" : "إلغاء إسناد الكوتش");

    audit({
      actor: actorOf(guard.ctx),
      action: "subscription.coach_assigned",
      entity: "subscription",
      entityId: existing.orderId,
      meta: { coachId },
      ip: guard.ip,
    });
  }

  if (done.length === 0) return errorJson("مفيش حاجة تتعمل — ابعت action أو coachId", 400);

  return json({ ok: true, subscription: updated, message: `تم: ${done.join(" + ")}` });
}

/** حذف نهائي من قاعدة البيانات — المدير العام بس (بيفضل أثره في سجل العمليات) */
export async function DELETE(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const guard = await authorize(request, "subscriptions:delete");
  if (!guard.ok) return guard.response;

  const { orderId } = await ctx.params;
  const existing = getSubscription(decodeURIComponent(orderId));
  if (!existing) return errorJson("الاشتراك مش موجود", 404);

  deleteSubscription(existing.orderId);

  audit({
    actor: actorOf(guard.ctx),
    action: "subscription.deleted",
    entity: "subscription",
    entityId: existing.orderId,
    meta: {
      member: existing.member.name,
      plan: existing.planName,
      total: existing.total,
      status: existing.status,
      reason: cleanText(new URL(request.url).searchParams.get("reason"), 200) || null,
    },
    ip: guard.ip,
  });

  return json({ ok: true, message: `اتمسح الاشتراك ${existing.orderId} نهائيًا`, orderId: existing.orderId });
}
