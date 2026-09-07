import { authorize } from "@/app/lib/auth/guard";
import { ROLE_PERMISSIONS } from "@/app/lib/auth/roles";
import { json } from "@/app/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** مين أنا؟ الواجهة بتنده عليها أول ما تفتح عشان تعرف تعرض إيه */
export async function GET(request: Request) {
  const guard = await authorize(request);
  if (!guard.ok) return guard.response;

  const { user, session } = guard.ctx;
  return json({
    ok: true,
    user,
    permissions: ROLE_PERMISSIONS[user.role],
    session: { expiresAt: session.expiresAt, absoluteExpiresAt: session.absoluteExpiresAt },
  });
}
