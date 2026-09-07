import { actorOf, authorize } from "@/app/lib/auth/guard";
import { hashPassword, passwordProblem } from "@/app/lib/auth/password";
import { canManageRole, isRole, ROLE_PERMISSIONS } from "@/app/lib/auth/roles";
import { audit } from "@/app/lib/db/audit";
import { createUser, findUserByEmail, listUsers, normalizeEmail } from "@/app/lib/db/users";
import { cleanPhone, cleanText, errorJson, fieldErrors, json, readJson } from "@/app/lib/http";
import { EG_PHONE_RE } from "@/app/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** قائمة المستخدمين — متاحة للمدير العام ومدير الفرع (قراءة) */
export async function GET(request: Request) {
  const guard = await authorize(request, "users:read");
  if (!guard.ok) return guard.response;

  return json({
    ok: true,
    items: listUsers(),
    roles: Object.fromEntries(Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => [role, perms])),
    canManage: guard.ctx.user.role === "owner",
  });
}

/** إنشاء مستخدم جديد — المدير العام بس */
export async function POST(request: Request) {
  const guard = await authorize(request, "users:manage");
  if (!guard.ok) return guard.response;

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const name = cleanText(body.name, 60);
  const email = normalizeEmail(cleanText(body.email, 160));
  const phone = cleanPhone(body.phone);
  const role = body.role;
  const password = typeof body.password === "string" ? body.password : "";
  const trainerSlug = cleanText(body.trainerSlug, 40) || null;

  const fields: Record<string, string> = {};
  if (name.length < 3) fields.name = "الاسم قصير أوي (3 حروف على الأقل)";
  if (!EMAIL_RE.test(email)) fields.email = "إيميل غير صحيح";
  if (phone && !EG_PHONE_RE.test(phone)) fields.phone = "رقم موبايل مصري غير صحيح";
  if (!isRole(role)) fields.role = "الدور ده مش موجود";
  else if (!canManageRole(guard.ctx.user.role, role)) fields.role = "مش مسموح لك تنشئ الدور ده";
  const problem = passwordProblem(password);
  if (problem) fields.password = problem;
  if (Object.keys(fields).length) return fieldErrors(fields, "مش قادرين نعمل المستخدم");

  if (findUserByEmail(email)) return fieldErrors({ email: "الإيميل ده مستخدم بالفعل" }, "الإيميل متكرر");

  const user = createUser({
    name,
    email,
    phone: phone || null,
    role: role as Parameters<typeof createUser>[0]["role"],
    trainerSlug: role === "coach" ? trainerSlug : null,
    passwordHash: await hashPassword(password),
    mustChangePassword: true, // أول دخول لازم يغيّرها
    createdBy: guard.ctx.user.id,
  });

  audit({ actor: actorOf(guard.ctx), action: "user.created", entity: "user", entityId: user.id, meta: { email: user.email, role: user.role }, ip: guard.ip });

  return json({ ok: true, user, message: `اتعمل حساب ${user.name}` }, { status: 201 });
}
