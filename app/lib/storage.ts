"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * طبقة صغيرة فوق localStorage مبنية على useSyncExternalStore:
 * — آمنة مع hydration (السيرفر ياخد القيمة الافتراضية)
 * — متزامنة بين التبويبات (حدث storage)
 * — من غير setState داخل useEffect
 */
type Entry = { raw: string | null; value: unknown };

const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readSnapshot<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    /* تصفح في وضع خاص — نتجاهل */
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = parse(raw, fallback);
  cache.set(key, { raw, value });
  return value as T;
}

function writeValue<T>(key: string, next: T) {
  const raw = JSON.stringify(next);
  cache.set(key, { raw, value: next });
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    /* quota ممتلئ — الحالة لسه شغالة في الذاكرة */
  }
  notify(key);
}

export function usePersistentState<T>(key: string, initial: T) {
  // القيمة الافتراضية بتتاخد مرة واحدة عشان الـ callbacks تفضل مستقرة
  const initialRef = useRef(initial);
  const fallback = initialRef.current;

  const subscribe = useCallback(
    (cb: () => void) => {
      const set = listeners.get(key) ?? new Set<() => void>();
      set.add(cb);
      listeners.set(key, set);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key || e.key === null) cb();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        set.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => readSnapshot(key, fallback), [key, fallback]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  const value = useSyncExternalStore<T>(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const current = readSnapshot(key, fallback);
      const next = typeof updater === "function" ? (updater as (p: T) => T)(current) : updater;
      writeValue(key, next);
    },
    [key, fallback],
  );

  return { value, setValue } as const;
}

/* ============================ وقت الجهاز ============================ */
export type Clock = { now: number; hour: number; weekday: string };
const EMPTY_CLOCK: Clock = { now: 0, hour: -1, weekday: "" };
let clock: Clock = EMPTY_CLOCK;
const clockListeners = new Set<() => void>();
let clockTimer: number | null = null;

function localHour(): number {
  try {
    const h = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", hour12: false }).format(
      new Date(),
    );
    const v = parseInt(h, 10);
    return Number.isNaN(v) ? new Date().getHours() : v;
  } catch {
    return new Date().getHours();
  }
}

function cairoWeekday(): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", weekday: "short" }).format(new Date()).toUpperCase();
  } catch {
    return "";
  }
}

function syncClock() {
  const next: Clock = { now: Math.floor(Date.now() / 1000) * 1000, hour: localHour(), weekday: cairoWeekday() };
  if (clock.now === next.now && clock.hour === next.hour && clock.weekday === next.weekday) return false;
  clock = next;
  return true;
}

function subscribeClock(cb: () => void) {
  clockListeners.add(cb);
  if (clockTimer === null) {
    clockTimer = window.setInterval(() => {
      if (syncClock()) clockListeners.forEach((l) => l());
    }, 30_000);
  }
  return () => {
    clockListeners.delete(cb);
    if (clockListeners.size === 0 && clockTimer !== null) {
      window.clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

/** الوقت الحالي + الساعة في القاهرة — بيتحدث كل 30 ثانية ومن غير setState يدوي */
export function useClock(): Clock {
  return useSyncExternalStore(subscribeClock, () => (syncClock(), clock), () => EMPTY_CLOCK);
}

/** true بعد ما المتصفح يريتشر الصفحة (لأي شيء بيعتمد على وقت أو localStorage) */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
