/**
 * الأدوار والصلاحيات — ملف مشترك بين السيرفر والمتصفح (مفيش أي import من node هنا).
 *
 * القاعدة: الواجهة بتخفي الأزرار حسب الصلاحية، **والسيرفر هو اللي بيمنع فعليًا**.
 * أي endpoint بيعدّل داتا لازم يعدي على `requirePermission()` في `app/lib/auth/guard.ts`.
 */

export const ROLES = ["owner", "admin", "coach", "reception"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard:view",
  /* الاشتراكات */
  "subscriptions:read", // كل الاشتراكات
  "subscriptions:read:own", // اشتراكات الأعضاء المسندين للكوتش بس
  "subscriptions:update", // تجميد / استئناف / تعديل الكوتش المسؤول
  "subscriptions:cancel", // إلغاء الاشتراك (بيفضل في السجل)
  "subscriptions:delete", // حذف نهائي — المدير العام بس
  /* الحجوزات */
  "bookings:read",
  "bookings:read:own",
  "bookings:create",
  "bookings:update",
  "bookings:delete",
  /* المستخدمين */
  "users:read",
  "users:manage", // إنشاء/تعديل/تعطيل/حذف مستخدم + تغيير الدور
  /* غير ذلك */
  "revenue:read", // أرقام الإيراد
  "audit:read", // سجل العمليات
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** مصفوفة الصلاحيات — مصدر الحقيقة الوحيد لكل الأدوار */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  /** المدير العام: كل حاجة، وهو الوحيد اللي بيمسح نهائي أو بيدير المستخدمين */
  owner: [...PERMISSIONS],

  /** مدير الفرع: بيدير الاشتراكات والحجوزات، بيشوف الإيراد، بس مش بيمسح نهائي ولا بيدير المستخدمين */
  admin: [
    "dashboard:view",
    "subscriptions:read",
    "subscriptions:update",
    "subscriptions:cancel",
    "bookings:read",
    "bookings:create",
    "bookings:update",
    "bookings:delete",
    "users:read",
    "revenue:read",
    "audit:read",
  ],

  /** الكوتش: بيشوف أعضاءه هو بس، وبيحدّث حالة حجوزاته — مفيش فلوس ومفيش إلغاء */
  coach: ["dashboard:view", "subscriptions:read:own", "bookings:read:own", "bookings:update"],

  /** الاستقبال: بيسجّل ويشوف الحجوزات، بيشوف الاشتراكات من غير أرقام الإيراد */
  reception: ["dashboard:view", "subscriptions:read", "bookings:read", "bookings:create", "bookings:update"],
};

export const ROLE_LABEL: Record<Role, string> = {
  owner: "المدير العام",
  admin: "مدير الفرع",
  coach: "كوتش",
  reception: "استقبال",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: "صلاحيات كاملة: إدارة المستخدمين، إلغاء أو حذف أي اشتراك، وسجل العمليات.",
  admin: "إدارة الاشتراكات والحجوزات والإيراد — من غير حذف نهائي ولا إدارة مستخدمين.",
  coach: "بيشوف الأعضاء المسندين له وحجوزاته فقط.",
  reception: "تسجيل ومتابعة الحجوزات وعرض الاشتراكات بدون أرقام مالية.",
};

export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** بيشوف الاشتراكات/الحجوزات بتاعته هو بس؟ (الكوتش) */
export function isScopedToOwn(role: Role): boolean {
  return can(role, "subscriptions:read:own") && !can(role, "subscriptions:read");
}

/** أي دور يقدر يتعامل مع الدور ده؟ (المدير العام بس هو اللي بيلمس مدير عام تاني) */
export function canManageRole(actor: Role, target: Role): boolean {
  if (!can(actor, "users:manage")) return false;
  if (target === "owner") return actor === "owner";
  return true;
}
