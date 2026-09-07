import "server-only";
import { cookies } from "next/headers";
import { resolveSession, SESSION_COOKIE, type AuthContext } from "./session";

/**
 * قراءة الجلسة داخل الـ Server Components (صفحات /admin).
 * ملاحظة: ده تحقق حقيقي من قاعدة البيانات — مش مجرد وجود كوكي زي اللي في `proxy.ts`.
 */
export async function currentSession(): Promise<AuthContext | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return resolveSession(raw);
}
