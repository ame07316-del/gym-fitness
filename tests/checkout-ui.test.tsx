// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Checkout from "@/app/components/Checkout";
import { quoteOf, type Membership } from "@/app/lib/subscription";
import type { useGym } from "@/app/lib/store";

// Keep motion elements mounted between renders, without waiting for browser animations in jsdom.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        const Component = React.forwardRef<HTMLElement, Record<string, unknown>>(function MotionElement(props, ref) {
          const attrs = { ...props };
          for (const key of ["initial", "animate", "exit", "transition", "layout", "layoutId", "whileHover"]) delete attrs[key];
          return React.createElement(tag, { ...attrs, ref });
        });
        cache.set(tag, Component);
      }
      return cache.get(tag);
    },
  });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

const GymTestContext = React.createContext<ReturnType<typeof useGym> | null>(null);
vi.mock("@/app/lib/store", async () => {
  const React = await import("react");
  return { useGym: () => React.useContext(GymTestContext) };
});
vi.mock("@/app/components/ui/Overlay", () => ({
  Modal: ({ open, children, footer, title }: { open: boolean; children: React.ReactNode; footer: React.ReactNode; title: string }) =>
    open ? <div role="dialog" aria-label={title}>{children}{footer}</div> : null,
}));
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/app/components/ui/Toast", () => ({ useToast: () => toast }));

const draft = { planId: "pro" as const, cycle: "quarterly" as const, addonIds: [], coupon: null };
const quote = quoteOf(draft);
const membership: Membership = {
  ...draft, orderId: "FZ-TEST", planName: quote.planName, member: { name: "أحمد محمود", phone: "01012345678", goal: "لياقة" },
  payment: "card", total: quote.total, perMonth: quote.perMonth, months: quote.months, startedAt: Date.now(),
  endsAt: Date.now() + 90 * 86400000, status: "active", autoRenew: true, frozenAt: null, frozenDaysUsed: 0,
};

function Harness({ confirmSubscription = vi.fn().mockResolvedValue(membership) }: { confirmSubscription?: ReturnType<typeof vi.fn> }) {
  const [step, setStep] = useState(0);
  const gym = {
    checkout: { open: true, step }, setCheckoutStep: setStep, closeCheckout: vi.fn(), setPanelOpen: vi.fn(),
    draft, quote, confirmSubscription,
  } as unknown as ReturnType<typeof useGym>;
  return <GymTestContext.Provider value={gym}><Checkout /></GymTestContext.Provider>;
}

async function goToPayment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /التالي/ }));
  const name = screen.getByPlaceholderText("مثال: محمود علي") as HTMLInputElement;
  await user.type(name, "أحمد محمود");
  expect(name.value).toBe("أحمد محمود");
  expect(document.activeElement).toBe(name);
  const phone = screen.getByPlaceholderText("01012345678") as HTMLInputElement;
  await user.type(phone, "01012345678");
  expect(phone.value).toBe("01012345678");
  await user.click(screen.getByRole("button", { name: /التالي/ }));
  await user.click(screen.getByRole("button", { name: /4242 4242 4242 4242/ }));
}

beforeEach(() => toast.mockClear());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("التشيك أوت في المتصفح", () => {
  it("كتابة بيانات العضو والكارت لا تفقد تركيز الخانة بعد أول حرف", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await goToPayment(user);
    const holder = screen.getByPlaceholderText("MAHMOUD ALI") as HTMLInputElement;
    await user.clear(holder);
    await user.type(holder, "Ahmed Mahmoud");
    expect(holder.value).toBe("Ahmed Mahmoud");
    expect(document.activeElement).toBe(holder);
  });

  it("الـ OTP يفضل ظاهر بعد الكتابة والرمز الغلط، وينفع المحاولة تاني", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, status: "requires_action", reference: "pi_s1_test", amount: quote.total, provider: "sandbox", message: "ادخل الرمز" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, status: "requires_action", reference: "pi_s1_test", message: "رمز غير صحيح" }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, status: "succeeded", reference: "pi_s1_test", amount: quote.total, provider: "sandbox", message: "تم" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Harness />);
    await goToPayment(user);
    await user.click(screen.getByRole("button", { name: /ادفع/ }));

    const input = await screen.findByPlaceholderText("••••••") as HTMLInputElement;
    await user.type(input, "000000");
    expect(input.value).toBe("000000");
    await user.click(screen.getByRole("button", { name: "تأكيد الرمز" }));
    expect(await screen.findByText(/رمز غير صحيح/)).toBeTruthy();
    expect(screen.getByPlaceholderText("••••••")).toBeTruthy();

    const retryInput = screen.getByPlaceholderText("••••••") as HTMLInputElement;
    await user.clear(retryInput);
    await user.type(retryInput, "123456");
    await user.click(screen.getByRole("button", { name: "تأكيد الرمز" }));
    expect(await screen.findByText(/أهلاً يا أحمد/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("422 بعد الدفع يعرض خطأ السيرفر تحت بيانات العضو بدون تكرار الدفع", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true, status: "succeeded", reference: "pi_s1_saved", amount: quote.total, provider: "sandbox", message: "تم",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const confirmSubscription = vi.fn().mockImplementation(async (
      _data: unknown, _orderId: string, onValidationError: (fields: Record<string, string>) => void,
    ) => {
      onValidationError({ "member.phone": "رقم الموبايل محتاج مراجعة" });
      return null;
    });
    const user = userEvent.setup();
    render(<Harness confirmSubscription={confirmSubscription} />);
    await goToPayment(user);
    await user.click(screen.getByRole("button", { name: /5555 5555 5555 4444/ }));
    await user.click(screen.getByRole("button", { name: /ادفع/ }));
    expect(await screen.findByText("رقم الموبايل محتاج مراجعة")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("فشل حفظ العضوية بعد الدفع يعيد الحفظ بنفس رقم الطلب، مش السحب من البنك", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true, status: "succeeded", reference: "pi_s1_approved", amount: quote.total, provider: "sandbox", message: "تم",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const confirmSubscription = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(membership);
    const user = userEvent.setup();
    render(<Harness confirmSubscription={confirmSubscription} />);
    await goToPayment(user);
    await user.click(screen.getByRole("button", { name: /5555 5555 5555 4444/ }));
    await user.click(screen.getByRole("button", { name: /ادفع/ }));
    await user.click(await screen.findByRole("button", { name: /إعادة حفظ الاشتراك/ }));
    expect(await screen.findByText(/أهلاً يا أحمد/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(confirmSubscription).toHaveBeenCalledTimes(2);
    expect(confirmSubscription.mock.calls[0][1]).toBe(confirmSubscription.mock.calls[1][1]);
  });

  it("النقر السريع مرتين أثناء الاتصال بالبنك لا ينشئ عمليتي دفع", async () => {
    let resolve!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Harness />);
    await goToPayment(user);
    const button = screen.getByRole("button", { name: /ادفع/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(new Response(JSON.stringify({ ok: false, status: "failed", reference: "pi_s1_no", amount: quote.total, provider: "sandbox", message: "رفض" }), { status: 402 }));
    expect(await screen.findByText(/العملية اترفضت|رفض/)).toBeTruthy();
  });
});
