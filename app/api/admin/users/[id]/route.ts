import { actorOf, authorize } from "@/app/lib/auth/guard";
import { hashPassword, passwordProblem } from "@/app/lib/auth/password";
import { canManageRole, isRole } from "@/app/lib/auth/roles";
import { revokeAllSessionsFor } from "@/app/lib/auth/session";
import { audit } from "@/app/lib/db/audit";
import { countOwners, deleteUser, findUserById, toPublicUser, updateUser } from "@/app/lib/db/users";
import { cleanPhone, cleanText, errorJson, fieldErrors, json, readJson } from "@/app/lib/http";
import { EG_PHONE_RE } from "@/app/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** تعديل مستخدم: الاسم/التليفون/الدور/التفعيل/كلمة سر جديدة — المدير العام بس */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await authorize(request, "users:manage");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const target = findUserById(id);
  if (!target) return errorJson("المستخدم مش موجود", 404);
  if (!canManageRole(guard.ctx.user.role, target.role)) return errorJson("مش مسموح لك تعدّل الحساب ده", 403);

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const patch: Parameters<typeof updateUser>[1] = {};
  const fields: Record<string, string> = {};

  if (body.name !== undefined) {
    const name = cleanText(body.name, 60);
    if (name.length < 3) fields.name = "الاسم قصير أوي";
    else patch.name = name;
  }
  if (body.phone !== undefined) {
    const phone = cleanPhone(body.phone);
    if (phone && !EG_PHONE_RE.test(phone)) fields.phone = "رقم موبايل مصري غير صحيح";
    else patch.phone = phone || null;
  }
  if (body.trainerSlug !== undefined) patch.trainerSlug = cleanText(body.trainerSlug, 40) || null;

  if (body.role !== undefined) {
    if (!isRole(body.role)) fields.role = "الدور ده مش موجود";
    else if (!canManageRole(guard.ctx.user.role, body.role)) fields.role = "مش مسموح لك تدي الدور ده";
    else if (target.role === "owner" && body.role !== "owner" && countOwners(target.id) === 0) {
      fields.role = "لازم يفضل مدير عام واحد على الأقل";
    } else patch.role = body.role;
  }

  if (body.active !== undefined) {
    const active = body.active === true || body.active === 1;
    if (!active && target.role === "owner" && countOwners(target.id) === 0) {
      fields.active = "مينفعش توقف آخر مدير عام";
    } else if (!active && target.id === guard.ctx.user.id) {
      fields.active = "مينفعش توقف حسابك أنت";
    } else patch.active = active;
  }

  if (body.password !== undefined) {
    const problem = passwordProblem(typeof body.password === "string" ? body.password : "");
    if (problem) fields.password = problem;
    else {
      patch.passwordHash = await hashPassword(body.password as string);
      patch.mustChangePassword = true;
    }
  }

  if (Object.keys(fields).length) return fieldErrors(fields, "مش قادرين نحفظ التعديل");
  if (Object.keys(patch).length === 0) return errorJson("مفيش حاجة اتغيّرت", 400);

  const user = updateUser(id, patch);
  // تغيير الدور/كلمة السر/التعطيل = كل جلسات المستخدم ده تموت في الحال
  if (patch.role || patch.passwordHash || patch.active === false) revokeAllSessionsFor(id);

  audit({
    actor: actorOf(guard.ctx),
    action: "user.updated",
    entity: "user",
    entityId: id,
    meta: { changed: Object.keys(patch).filter((k) => k !== "passwordHash"), passwordReset: Boolean(patch.passwordHash) },
    ip: guard.ip,
  });

  return json({ ok: true, user, message: "اتحفظ التعديل" });
}

/** حذف مستخدم — المدير العام بس، ومش هيقدر يمسح نفسه ولا آخر مدير عام */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await authorize(request, "users:manage");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const target = findUserById(id);
  if (!target) return errorJson("المستخدم مش موجود", 404);
  if (target.id === guard.ctx.user.id) return errorJson("مينفعش تمسح حسابك أنت", 400);
  if (!canManageRole(guard.ctx.user.role, target.role)) return errorJson("مش مسموح لك تمسح الحساب ده", 403);
  if (target.role === "owner" && countOwners(target.id) === 0) return errorJson("لازم يفضل مدير عام واحد على الأقل", 400);

  revokeAllSessionsFor(id);
  deleteUser(id);

  audit({
    actor: actorOf(guard.ctx),
    action: "user.deleted",
    entity: "user",
    entityId: id,
    meta: { email: target.email, role: target.role },
    ip: guard.ip,
  });

  return json({ ok: true, message: `اتمسح حساب ${toPublicUser(target).name}` });
}
