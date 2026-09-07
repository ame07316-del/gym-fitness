import { actorOf, authorize, scopeCoachId } from "@/app/lib/auth/guard";
import { can } from "@/app/lib/auth/roles";
import { audit } from "@/app/lib/db/audit";
import { deleteBooking, getBooking, updateBooking, type BookingStatus } from "@/app/lib/db/bookings";
import { findUserById } from "@/app/lib/db/users";
import { cleanText, errorJson, json, readJson } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: BookingStatus[] = ["pending", "confirmed", "done", "no_show", "cancelled"];

/** تحديث حجز: الحالة / الكوتش / ملاحظة — الكوتش بيقدر يحدّث حجوزاته هو بس */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await authorize(request, "bookings:update");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const existing = getBooking(decodeURIComponent(id));
  if (!existing) return errorJson("الحجز مش موجود", 404);

  const scoped = scopeCoachId(guard.ctx);
  if (scoped && existing.coachId !== scoped) return errorJson("الحجز ده مش من حجوزاتك", 403, { code: "forbidden" });

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const patch: Parameters<typeof updateBooking>[1] = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as BookingStatus)) return errorJson("حالة غير معروفة", 422, { allowed: STATUSES });
    patch.status = body.status as BookingStatus;
  }
  if (body.notes !== undefined) patch.notes = cleanText(body.notes, 300) || null;
  if (body.coachId !== undefined) {
    // الكوتش ما يقدرش يوزّع الحجوزات على غيره
    if (!can(guard.ctx.user.role, "bookings:read")) return errorJson("مش مسموح لك تغيّر الكوتش", 403);
    const coachId = body.coachId === null || body.coachId === "" ? null : cleanText(body.coachId, 64);
    if (coachId) {
      const coach = findUserById(coachId);
      if (!coach || coach.role !== "coach" || coach.active !== 1) return errorJson("الكوتش ده مش موجود أو موقوف", 422);
    }
    patch.coachId = coachId;
  }
  if (Object.keys(patch).length === 0) return errorJson("مفيش حاجة اتغيّرت", 400);

  const booking = updateBooking(existing.id, patch);
  audit({ actor: actorOf(guard.ctx), action: "booking.updated", entity: "booking", entityId: existing.id, meta: patch, ip: guard.ip });

  return json({ ok: true, booking, message: "اتحدّث الحجز" });
}

/** حذف حجز — للمدير العام ومدير الفرع */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await authorize(request, "bookings:delete");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const existing = getBooking(decodeURIComponent(id));
  if (!existing) return errorJson("الحجز مش موجود", 404);

  deleteBooking(existing.id);
  audit({
    actor: actorOf(guard.ctx),
    action: "booking.deleted",
    entity: "booking",
    entityId: existing.id,
    meta: { name: existing.name },
    ip: guard.ip,
  });

  return json({ ok: true, message: `اتمسح حجز ${existing.name}` });
}
