// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiFetch } from "@/app/lib/api";
import { GymProvider, useGym } from "@/app/lib/store";

vi.mock("@/app/lib/api", () => ({
  apiFetch: vi.fn(),
  ENDPOINTS: { subscribe: "/api/subscribe", bookings: "/api/bookings" },
}));
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/app/components/ui/Toast", () => ({ useToast: () => toast }));
const fetchMock = vi.mocked(apiFetch);

function Probe({ onResult }: { onResult: (result: unknown) => void }) {
  const gym = useGym();
  const [fieldError, setFieldError] = useState("");
  return <>
    <button onClick={() => void gym.confirmSubscription({
      planId: "basic", planName: "أساسي", cycle: "monthly", addonIds: [], coupon: null,
      member: { name: "أحمد محمود", phone: "01012345678", goal: "لياقة" },
      payment: "card", total: 570, perMonth: 570, months: 1,
    }, "FZ-RETRY-01").then(onResult)}>اشتراك</button>
    <button onClick={() => void gym.addBooking({ name: "أحمد محمود", phone: "01012345678", goal: "لياقة", slot: "مساء", plan: "أساسي" }, (fields) => setFieldError(fields.phone)).then(onResult)}>حجز</button>
    <button onClick={gym.cancelMembership}>إلغاء التجديد</button>
    <button onClick={() => gym.bookSeat("0|18:00", "تمرين")}>مكان كلاس</button>
    <button onClick={() => gym.toggleClass("0|18:00", "تمرين")}>إلغاء كلاس</button>
    <button onClick={() => gym.toggleWaitlist("0|18:00", "تمرين")}>قائمة انتظار</button>
    <span data-testid="seats">{gym.seats["0|18:00"] ?? 0}</span>
    <span data-testid="classes">{gym.myClasses.length}</span>
    <span data-testid="waiting">{gym.waitlist.length}</span>
    <span data-testid="membership">{gym.membership?.orderId ?? "لا توجد عضوية"}</span>
    <span data-testid="active">{gym.hasMembership ? "نشطة" : "غير نشطة"}</span>
    <span data-testid="autorenew">{gym.membership?.autoRenew ? "تجديد تلقائي" : "لا يوجد تجديد"}</span>
    <span data-testid="bookings">{gym.bookings.length}</span>
    <span data-testid="field-error">{fieldError}</span>
  </>;
}

beforeEach(() => { fetchMock.mockReset(); toast.mockReset(); window.localStorage.clear(); });
afterEach(cleanup);

describe("عدم إظهار نجاح كاذب عند تعطل حفظ البيانات", () => {
  it("الاشتراك الفاشل لا يتخزن كعضوية نشطة، والمحاولة تستخدم رقم الطلب نفسه", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, data: null, error: "السيرفر مش متاح" })
      .mockResolvedValueOnce({ ok: true, status: 201, data: { ok: true, invoice: "INV-FZ-RETRY-01" }, error: null });
    const onResult = vi.fn();
    const user = userEvent.setup();
    render(<GymProvider><Probe onResult={onResult} /></GymProvider>);
    await user.click(screen.getByRole("button", { name: "اشتراك" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
    expect(screen.getByTestId("membership").textContent).toBe("لا توجد عضوية");
    expect(window.localStorage.getItem("fz.membership.v1")).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ kind: "error", title: "تعذّر تسجيل الاشتراك" }));

    await user.click(screen.getByRole("button", { name: "اشتراك" }));
    await waitFor(() => expect(screen.getByTestId("membership").textContent).toBe("FZ-RETRY-01"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.body).toMatchObject({ orderId: "FZ-RETRY-01" });
    expect(fetchMock.mock.calls[1][1]?.body).toMatchObject({ orderId: "FZ-RETRY-01" });
    await user.click(screen.getByRole("button", { name: "إلغاء التجديد" }));
    expect(screen.getByTestId("active").textContent).toBe("نشطة");
    expect(screen.getByTestId("autorenew").textContent).toBe("لا يوجد تجديد");
    expect(JSON.parse(window.localStorage.getItem("fz.membership.v1")!).status).toBe("active");
  });

  it("إلغاء كلاس يحرر المقعد، والانتظار لا يتحول لحجز مؤكد", async () => {
    const user = userEvent.setup();
    render(<GymProvider><Probe onResult={vi.fn()} /></GymProvider>);
    const book = screen.getByRole("button", { name: "مكان كلاس" });
    fireEvent.click(book);
    fireEvent.click(book);
    expect(screen.getByTestId("seats").textContent).toBe("1");
    expect(screen.getByTestId("classes").textContent).toBe("1");
    await user.click(screen.getByRole("button", { name: "إلغاء كلاس" }));
    expect(screen.getByTestId("seats").textContent).toBe("0");
    expect(screen.getByTestId("classes").textContent).toBe("0");
    await user.click(screen.getByRole("button", { name: "قائمة انتظار" }));
    expect(screen.getByTestId("waiting").textContent).toBe("1");
    expect(screen.getByTestId("classes").textContent).toBe("0");
    expect(screen.getByTestId("seats").textContent).toBe("0");
    await user.click(screen.getByRole("button", { name: "قائمة انتظار" }));
    expect(screen.getByTestId("waiting").textContent).toBe("0");
  });

  it("الحجز الفاشل لا يبان مؤكد ولا يمسح بيانات المستخدم", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422, data: null, error: "حصل خطأ", fields: { phone: "راجع رقمك" } });
    const onResult = vi.fn();
    const user = userEvent.setup();
    render(<GymProvider><Probe onResult={onResult} /></GymProvider>);
    await user.click(screen.getByRole("button", { name: "حجز" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
    expect(screen.getByTestId("bookings").textContent).toBe("0");
    expect(screen.getByTestId("field-error").textContent).toBe("راجع رقمك");
    expect(window.localStorage.getItem("fz.bookings.v1")).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ kind: "error", title: "طلب الحجز ما اتبعتش" }));
  });
});
