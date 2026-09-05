"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useClock, useHydrated, usePersistentState } from "./storage";
import { addMonths, quoteOf, type Draft, type Membership } from "./subscription";
import { FREEZE_DAYS_LIMIT } from "./data";
import { daysBetween, uid } from "./utils";
import { useToast } from "@/app/components/ui/Toast";

export type Booking = {
  id: string;
  name: string;
  phone: string;
  goal: string;
  slot: string;
  plan: string;
  createdAt: number;
  status: "pending" | "confirmed";
};

export type Checkout = { open: boolean; step: number };

type Ctx = {
  /* الاشتراك الحالي */
  membership: Membership | null;
  hasMembership: boolean;
  memberUiReady: boolean;
  daysLeft: number;
  progress: number;
  confirmSubscription: (m: Omit<Membership, "orderId" | "startedAt" | "endsAt" | "status" | "autoRenew" | "frozenAt" | "frozenDaysUsed">) => Promise<Membership | null>;
  renew: () => void;
  toggleFreeze: () => void;
  cancelMembership: () => void;
  setAutoRenew: (v: boolean) => void;
  history: Membership[];

  /* سلة/دفتر الاشتراك */
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  quote: ReturnType<typeof quoteOf>;
  toggleAddon: (id: string) => void;

  /* النوافذ */
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  openCheckout: (planId?: Draft["planId"]) => void;
  closeCheckout: () => void;
  checkout: Checkout;
  setCheckoutStep: (n: number) => void;

  /* تفاعلات العضو */
  favorites: string[];
  toggleFavorite: (id: string) => void;
  myClasses: string[];
  toggleClass: (key: string, label: string) => void;
  seats: Record<string, number>;
  bookSeat: (key: string, name: string) => void;
  bookings: Booking[];
  addBooking: (b: Omit<Booking, "id" | "createdAt" | "status">) => Promise<Booking | null>;
  removeBooking: (id: string) => void;

  /* تعبئة نموذج الحجز من أي مكان في الموقع */
  prefill: { goal?: string; trainer?: string };
  requestBooking: (p: { goal?: string; trainer?: string }, scrollTo?: boolean) => void;
};

const GymCtx = createContext<Ctx | null>(null);

const DEFAULT_DRAFT: Draft = { planId: "pro", cycle: "quarterly", addonIds: [], coupon: null };
const EMPTY_PREFILL = {} as const;

export function GymProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  const { value: membership, setValue: setMembership } = usePersistentState<Membership | null>("fz.membership.v1", null);
  const { value: history, setValue: setHistory } = usePersistentState<Membership[]>("fz.history.v1", []);
  const { value: favStored, setValue: setFav } = usePersistentState<string[]>("fz.favs.v1", []);
  const { value: classesStored, setValue: setClasses } = usePersistentState<string[]>("fz.classes.v1", []);
  const { value: seatsStored, setValue: setSeats } = usePersistentState<Record<string, number>>("fz.seats.v1", {});
  const { value: bookingsStored, setValue: setBookings } = usePersistentState<Booking[]>("fz.bookings.v1", []);
  const hydrated = useHydrated();
  const { now: nowMs } = useClock();

  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [panelOpen, setPanelOpen] = useState(false);
  const [checkout, setCheckout] = useState<Checkout>({ open: false, step: 0 });
  const [seatsLocal, setSeatsLocal] = useState<Record<string, number>>({});

  const quote = useMemo(() => quoteOf(draft), [draft]);

  /* حالة العضوية الحية: انتهاء / أيام متبقية */
  const effectiveStatus = useMemo(() => {
    if (!membership) return null;
    if (membership.status === "cancelled") return "cancelled" as const;
    if (membership.status === "expired" || (nowMs > 0 && membership.endsAt < nowMs)) return "expired" as const;
    return membership.status;
  }, [membership, nowMs]);

  const daysLeft = membership && nowMs > 0 ? daysBetween(nowMs, membership.endsAt) : 0;
  const progress = useMemo(() => {
    if (!membership || nowMs <= 0) return 0;
    const total = membership.endsAt - membership.startedAt;
    return Math.min(1, Math.max(0, (nowMs - membership.startedAt) / (total || 1)));
  }, [membership, nowMs]);

  const openCheckout = useCallback((planId?: Draft["planId"]) => {
    setCheckout({ open: true, step: 0 });
    if (planId) setDraft((d) => ({ ...d, planId }));
  }, []);

  const closeCheckout = useCallback(() => {
    setCheckout((c) => ({ ...c, open: false }));
    setDraft(DEFAULT_DRAFT);
  }, []);
  const setCheckoutStep = useCallback((n: number) => setCheckout((c) => ({ ...c, step: n })), []);

  const toggleAddon = useCallback((id: string) => {
    setDraft((d) => ({ ...d, addonIds: d.addonIds.includes(id) ? d.addonIds.filter((x) => x !== id) : [...d.addonIds, id] }));
  }, []);

  const confirmSubscription: Ctx["confirmSubscription"] = useCallback(
    async (base) => {
      const rec: Membership = {
        ...base,
        orderId: uid("FZ"),
        startedAt: Date.now(),
        endsAt: addMonths(Date.now(), base.months),
        status: "active",
        autoRenew: base.cycle !== "monthly",
        frozenAt: null,
        frozenDaysUsed: 0,
      };
      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rec),
        });
        if (!res.ok) throw new Error("bad status");
      } catch {
        toast({
          kind: "warn",
          title: "الاشتراك اتسجّل على جهازك",
          body: " السيرفر مش متاح دلوقتي — بياناتك محفوظة ومحفوظ لك مرجع الطلب.",
        });
      }
      setMembership(rec);
      setHistory((h) => [rec, ...h].slice(0, 12));
      toast({ kind: "success", title: `تم تفعيل عضوية ${rec.planName} 🎉`, body: `رقم الطلب ${rec.orderId}` });
      return rec;
    },
    [setHistory, setMembership, toast],
  );

  const renew = useCallback(() => {
    if (!membership) return;
    const endsAt = addMonths(Math.max(membership.endsAt, Date.now()), membership.months);
    setMembership({ ...membership, endsAt, status: "active", startedAt: Math.min(membership.startedAt, Date.now()) });
    toast({ kind: "success", title: "تم تجديد الاشتراك", body: `صلاحيته هتخلص في ${new Intl.DateTimeFormat("ar-EG", { dateStyle: "long" }).format(new Date(endsAt))}` });
  }, [membership, setMembership, toast]);

  const toggleFreeze = useCallback(() => {
    if (!membership) return;
    if (membership.status === "frozen") {
      const days = daysBetween(membership.frozenAt ?? Date.now(), Date.now());
      setMembership({
        ...membership,
        status: "active",
        frozenAt: null,
        frozenDaysUsed: membership.frozenDaysUsed + days,
        endsAt: addMonths(membership.endsAt, 0) + days * 86_400_000,
      });
      toast({ kind: "info", title: "العضوية رجعت نشطة", body: `اتمدّد الاشتراك ${days} يوم تعويضاً.` });
      return;
    }
    const left = FREEZE_DAYS_LIMIT - membership.frozenDaysUsed;
    if (left <= 0) {
      toast({ kind: "error", title: "استهلكت أيام التجميد", body: `الحد الأقصى ${FREEZE_DAYS_LIMIT} يوم في السنة.` });
      return;
    }
    setMembership({ ...membership, status: "frozen", frozenAt: Date.now() });
    toast({ kind: "warn", title: "تم تجميد العضوية", body: `فاضيلك ${left} يوم تجميد هذه السنة.` });
  }, [membership, setMembership, toast]);

  const cancelMembership = useCallback(() => {
    if (!membership) return;
    setMembership({ ...membership, status: "cancelled", autoRenew: false });
    toast({ kind: "warn", title: "تم إلغاء التجديد التلقائي", body: "العضوية هتفضل شغالة لحد نهاية الفترة المدفوعة." });
  }, [membership, setMembership, toast]);

  const setAutoRenew = useCallback(
    (v: boolean) => {
      if (!membership) return;
      setMembership({ ...membership, autoRenew: v });
      toast({ kind: v ? "success" : "info", title: v ? "التجديد التلقائي اتفعّل" : "التجديد التلقائي اتقفل" });
    },
    [membership, setMembership, toast],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setFav((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
    },
    [setFav],
  );

  const toggleClass = useCallback(
    (key: string, label: string) => {
      setClasses((c) => {
        const has = c.includes(key);
        toast(
          has
            ? { kind: "info", title: "اتشالت من جدولك", body: label }
            : { kind: "success", title: "اتضافت لجدولك", body: label },
        );
        return has ? c.filter((x) => x !== key) : [...c, key];
      });
    },
    [setClasses, toast],
  );

  const bookSeat = useCallback(
    (key: string, name: string) => {
      const next = (seatsLocal[key] ?? 0) + 1;
      setSeatsLocal((s) => ({ ...s, [key]: next }));
      setSeats((s) => ({ ...s, [key]: next }));
      setClasses((c) => (c.includes(key) ? c : [...c, key]));
      toast({ kind: "success", title: "حجزنا لك مكان 👌", body: name });
    },
    [seatsLocal, setSeats, setClasses, toast],
  );

  const addBooking: Ctx["addBooking"] = useCallback(
    async (b) => {
      const rec: Booking = { ...b, id: uid("BK"), createdAt: Date.now(), status: "pending" };
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rec),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error ?? "فشل الإرسال");
        }
        rec.status = "confirmed";
      } catch (e) {
        toast({
          kind: "warn",
          title: "استلمنا طلبك على جهازك",
          body: "مش قادر نوصل السيرفر دلوقتي — هنبعتلك على الواتساب للتأكيد.",
        });
        console.error(e);
      }
      setBookings((s) => [rec, ...s].slice(0, 20));
      toast({ kind: "success", title: "تم إرسال طلب الحجز ✅", body: `الكود: ${rec.id}` });
      return rec;
    },
    [setBookings, toast],
  );

  const removeBooking = useCallback(
    (id: string) => {
      setBookings((s) => s.filter((b) => b.id !== id));
      toast({ kind: "info", title: "اتلغى الحجز" });
    },
    [setBookings, toast],
  );

  const seats = useMemo(() => ({ ...seatsStored, ...seatsLocal }), [seatsStored, seatsLocal]);

  /** يطلب تعبئة فورم الحجز (عن طريق حدث DOM — من غير setState وقت الرسم) */
  const requestBooking = useCallback((p: { goal?: string; trainer?: string }, scrollTo = true) => {
    window.dispatchEvent(new CustomEvent("fz:booking", { detail: p }));
    if (scrollTo) {
      const el = document.getElementById("booking");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const value: Ctx = {
    membership: membership ? { ...membership, status: effectiveStatus ?? membership.status } : null,
    hasMembership: !!membership && (effectiveStatus === "active" || effectiveStatus === "frozen"),
    memberUiReady: hydrated,
    daysLeft,
    progress,
    confirmSubscription,
    renew,
    toggleFreeze,
    cancelMembership,
    setAutoRenew,
    history,
    draft,
    setDraft,
    quote,
    toggleAddon,
    panelOpen,
    setPanelOpen,
    openCheckout,
    closeCheckout,
    checkout,
    setCheckoutStep,
    favorites: favStored,
    toggleFavorite,
    myClasses: classesStored,
    toggleClass,
    seats,
    bookSeat,
    bookings: bookingsStored,
    addBooking,
    removeBooking,
    prefill: EMPTY_PREFILL,
    requestBooking,
  };

  return <GymCtx.Provider value={value}>{children}</GymCtx.Provider>;
}

export function useGym() {
  const c = useContext(GymCtx);
  if (!c) throw new Error("useGym should be used inside <GymProvider>");
  return c;
}
