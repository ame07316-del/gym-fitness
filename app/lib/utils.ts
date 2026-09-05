export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/** تنسيق سعر بالم جنيه مصري */
export const egp = (n: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ج.م";

export const number = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

/** تاريخ ميلادي بصيغة مصرية مقروءة */
export const fmtDate = (ts: number) =>
  new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ts));

export const fmtShort = (ts: number) =>
  new Intl.DateTimeFormat("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(ts));

export const uid = (prefix = "FZ") => {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${new Date().getFullYear()}-${rand}${Math.floor(Math.random() * 90 + 10)}`;
};

export const daysBetween = (a: number, b: number) =>
  Math.max(0, Math.ceil((b - a) / 86_400_000));

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** موبايل مصري: 01 + 10 أرقام */
export const isEGPhone = (v: string) => /^(\+?2)?01[0-9]{9}$/.test(v.replace(/[\s-]/g, ""));
