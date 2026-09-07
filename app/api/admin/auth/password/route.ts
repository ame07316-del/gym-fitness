import { actorOf, authorize } from "@/app/lib/auth/guard";
import { hashPassword, passwordProblem, verifyPassword } from "@/app/lib/auth/password";
import { createSession, revokeAllSessionsFor, sessionCookies } from "@/app/lib/auth/session";
import { audit } from "@/app/lib/db/audit";
import { hitRateLimit } from "@/app/lib/db/rate-limit";
import { updateUser } from "@/app/lib/db/users";
import { errorJson, fieldErrors, json, readJson } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** تغيير كلمة السر بتاعتي أنا — بيلغي كل الجلسات التانية ويطلع لي جلسة جديدة */
export async function POST(request: Request) {
  const guard = await authorize(request);
  if (!guard.ok) return guard.response;

  const limit = hitRateLimit(`pwd:${guard.ctx.user.id}`, { limit: 5, windowMs: 15 * 60_000 });
  if (!limit.ok) return errorJson("محاولات كتير — استنى شوية", 429, { retryAfter: limit.retryAfterSeconds });

  const body = await readJson(request);
  if (!body) return errorJson("JSON غير صالح", 400);

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!(await verifyPassword(currentPassword, guard.ctx.row.password_hash))) {
    return fieldErrors({ currentPassword: "كلمة السر الحالية غلط" }, "مش قادرين نغيّر كلمة السر");
  }
  const problem = passwordProblem(newPassword);
  if (problem) return fieldErrors({ newPassword: problem }, "كلمة السر الجديدة ضعيفة");
  if (newPassword === currentPassword) {
    return fieldErrors({ newPassword: "لازم تكون مختلفة عن القديمة" }, "كلمة السر الجديدة ضعيفة");
  }

  const passwordHash = await hashPassword(newPassword);
  updateUser(guard.ctx.user.id, { passwordHash, mustChangePassword: false });

  // أي جلسة تانية (على جهاز تاني أو مسروقة) بتموت دلوقتي
  revokeAllSessionsFor(guard.ctx.user.id);
  const session = createSession(guard.ctx.user.id, { ip: guard.ip, userAgent: request.headers.get("user-agent") });

  audit({ actor: actorOf(guard.ctx), action: "auth.password_changed", entity: "user", entityId: guard.ctx.user.id, ip: guard.ip });

  return json(
    { ok: true, message: "اتغيّرت كلمة السر، وكل الجلسات التانية اتقفلت", csrfToken: session.csrfToken },
    { cookies: sessionCookies(request, session) },
  );
}
