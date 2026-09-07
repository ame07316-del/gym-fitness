import { audit } from "@/app/lib/db/audit";
import { actorOf, authorize } from "@/app/lib/auth/guard";
import { clearedCookies, parseCookies, revokeSession, SESSION_COOKIE } from "@/app/lib/auth/session";
import { json } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await authorize(request);
  // حتى لو الجلسة باظت بنمسح الكوكيز على أي حال
  if (guard.ok) {
    const raw = parseCookies(request)[SESSION_COOKIE];
    if (raw) revokeSession(raw);
    audit({ actor: actorOf(guard.ctx), action: "auth.logout", entity: "user", entityId: guard.ctx.user.id, ip: guard.ip });
  }
  return json({ ok: true }, { cookies: clearedCookies(request) });
}
