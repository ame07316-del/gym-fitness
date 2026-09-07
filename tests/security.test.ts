import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/app/lib/rate-limit";

describe("rate limiting", () => {
  it("يقفل الطلبات بعد الحد ويرجع وقت الانتظار", () => {
    const makeRequest = () =>
      new Request("http://local.test/api", { headers: { "x-forwarded-for": "198.51.100.42" } });

    expect(checkRateLimit(makeRequest(), "security-test", 2).allowed).toBe(true);
    expect(checkRateLimit(makeRequest(), "security-test", 2).allowed).toBe(true);
    const blocked = checkRateLimit(makeRequest(), "security-test", 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
});
