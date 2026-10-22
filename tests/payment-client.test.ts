import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/app/lib/api";
import { authorize, confirmPayment } from "@/app/lib/payment";

vi.mock("@/app/lib/api", () => ({
  apiFetch: vi.fn(),
  ENDPOINTS: { pay: "/api/pay", payConfirm: "/api/pay/confirm" },
}));

const fetchMock = vi.mocked(apiFetch);
const card = { number: "4242 4242 4242 4242", exp: "12/29", cvv: "123", holder: "Mohamed Ali" };

beforeEach(() => fetchMock.mockReset());

describe("الواجهة لا تختلق نجاح الدفع وقت انقطاع السيرفر", () => {
  it("تعطل /api/pay لا يحوّل كارت صحيح أو كاش لعملية ناجحة", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 0, data: null, error: "السيرفر المحلي مش متاح" });
    const input = { method: "card" as const, amount: 9603.36, card };
    const result = await authorize(input);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.message).toContain("السيرفر");
    expect(fetchMock).toHaveBeenCalledWith("/api/pay", expect.objectContaining({ body: expect.objectContaining({ amount: 9603.36 }) }));

    const cash = await authorize({ method: "cash", amount: 570 });
    expect(cash.ok).toBe(false);
    expect(cash.status).toBe("failed");
  });

  it("تعطل /api/pay/confirm لا يعامل أي OTP صحيح على أنه معتمد", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, data: null, error: "الخدمة غير متاحة" });
    const result = await confirmPayment("pi_s1_real", "123456");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
  });

  it("رد البنك بالرفض يظل رفضاً؛ الرد الفارغ لا ينجح", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false, status: 402, error: "البنك رفض", data: { ok: false, status: "failed", reference: "pi_s1_declined", amount: 570, message: "البنك رفض", provider: "sandbox" },
    });
    expect((await authorize({ method: "card", amount: 570, card })).status).toBe("failed");
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, data: null, error: null });
    expect((await confirmPayment("pi_s1_real", "123456")).ok).toBe(false);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, data: { ok: true, status: "succeeded" } as never, error: null });
    expect((await authorize({ method: "card", amount: 570, card })).ok).toBe(false);
  });
});
