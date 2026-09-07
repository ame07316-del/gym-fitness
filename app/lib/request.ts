export type JsonObject = Record<string, unknown>;

type JsonObjectResult =
  | { ok: true; body: JsonObject }
  | { ok: false; error: string };

/** Read a request body without letting valid JSON primitives crash a route. */
export async function readJsonObject(request: Request): Promise<JsonObjectResult> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return { ok: false, error: "JSON غير صالح" };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "البيانات لازم تكون كائن JSON" };
  }

  return { ok: true, body: value as JsonObject };
}
