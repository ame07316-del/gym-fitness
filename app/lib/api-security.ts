import { timingSafeEqual } from "node:crypto";

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

/**
 * The dashboard-style GET endpoints are intentionally private. Keep the token
 * server-only and send it as `Authorization: Bearer ...` from an admin tool.
 */
export function isAdminRequest(request: Request) {
  const expected = process.env.ADMIN_API_TOKEN?.trim();
  if (!expected) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);

  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}
