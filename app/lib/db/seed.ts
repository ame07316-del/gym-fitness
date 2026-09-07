/**
 * زرع البيانات الأولية.
 *
 * — حساب المدير العام بيتعمل **دايمًا** (من غيره مفيش حد يقدر يدخل اللوحة).
 * — حسابات وبيانات العرض (مدير فرع/كوتشات/استقبال/اشتراكات تجريبية) بتتزرع بس
 *   في وضع العرض: `DEMO_SEED=1` أو أي بيئة مش production.
 *
 * الأمان: في الإنتاج لو `SEED_OWNER_PASSWORD` مش متظبط، بنولّد كلمة سر عشوائية
 * ونطبعها **مرة واحدة** في لوج السيرفر ونعلّم الحساب بأنه لازم يغيّرها.
 */
import { randomBytes, randomUUID } from "node:crypto";
import type { Database } from "better-sqlite3";
import { hashPasswordSync } from "../auth/password";

const DEMO_PASSWORDS: Record<string, string> = {
  owner: "Owner#Fit2026",
  admin: "Manager#Fit2026",
  coach: "Coach#Fit2026",
  reception: "Front#Fit2026",
};

const isDemo = () => {
  const flag = (process.env.DEMO_SEED ?? "").trim();
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return process.env.NODE_ENV !== "production";
};

type SeedUser = {
  name: string;
  email: string;
  role: "owner" | "admin" | "coach" | "reception";
  password: string;
  phone?: string;
  trainerSlug?: string;
  mustChange?: boolean;
};

function insertUser(db: Database, u: SeedUser) {
  const ts = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO users
      (id, name, email, phone, role, trainer_slug, password_hash, active, must_change_password, created_at, updated_at, created_by)
     VALUES (@id, @name, @email, @phone, @role, @trainerSlug, @hash, 1, @mustChange, @ts, @ts, 'seed')`,
  ).run({
    id: randomUUID(),
    name: u.name,
    email: u.email.toLowerCase(),
    phone: u.phone ?? null,
    role: u.role,
    trainerSlug: u.trainerSlug ?? null,
    hash: hashPasswordSync(u.password),
    mustChange: u.mustChange ? 1 : 0,
    ts,
  });
}

export function seedIfEmpty(db: Database) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n > 0) return;

  const demo = isDemo();
  const ownerEmail = (process.env.SEED_OWNER_EMAIL ?? "owner@fitzone.pro").toLowerCase().trim();
  let ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "";
  let mustChange = false;

  if (!ownerPassword) {
    if (demo) {
      ownerPassword = DEMO_PASSWORDS.owner;
    } else {
      ownerPassword = `${randomBytes(12).toString("base64url")}1a`;
      mustChange = true;
      console.warn(
        `\n[fitzone] اتعمل حساب المدير العام: ${ownerEmail}\n[fitzone] كلمة السر المؤقتة: ${ownerPassword}\n[fitzone] غيّرها من اللوحة فورًا — مش هتتطبع تاني.\n`,
      );
    }
  }

  insertUser(db, { name: "المدير العام", email: ownerEmail, role: "owner", password: ownerPassword, mustChange });
  if (!demo) return;

  /* ===================== بيانات العرض ===================== */
  insertUser(db, { name: "مروان عبد الله", email: "manager@fitzone.pro", role: "admin", password: DEMO_PASSWORDS.admin, phone: "01000000001" });
  insertUser(db, { name: "كابتن أحمد السيد", email: "coach.ahmed@fitzone.pro", role: "coach", password: DEMO_PASSWORDS.coach, phone: "01000000002", trainerSlug: "ahmed" });
  insertUser(db, { name: "كابتن محمد فاروق", email: "coach.mohamed@fitzone.pro", role: "coach", password: DEMO_PASSWORDS.coach, phone: "01000000003", trainerSlug: "mohamed" });
  insertUser(db, { name: "كابتن سارة منير", email: "coach.sara@fitzone.pro", role: "coach", password: DEMO_PASSWORDS.coach, phone: "01000000004", trainerSlug: "sara" });
  insertUser(db, { name: "نهى مصطفى", email: "reception@fitzone.pro", role: "reception", password: DEMO_PASSWORDS.reception, phone: "01000000005" });

  const coachIds = db.prepare("SELECT id, trainer_slug FROM users WHERE role = 'coach'").all() as {
    id: string;
    trainer_slug: string | null;
  }[];
  const coachOf = (slug: string) => coachIds.find((c) => c.trainer_slug === slug)?.id ?? null;

  const day = 86_400_000;
  const ts = Date.now();
  const subs = [
    { orderId: "FZ-2026-DEMO01", name: "منى خالد", phone: "01012345678", planId: "pro", plan: "برو", cycle: "yearly", months: 12, total: 9603, per: 800, pay: "wallet", coach: "sara", status: "active", ageDays: 40 },
    { orderId: "FZ-2026-DEMO02", name: "أحمد سمير", phone: "01099998888", planId: "vip", plan: "VIP", cycle: "semiannual", months: 6, total: 8721, per: 1450, pay: "cash", coach: "ahmed", status: "active", ageDays: 12 },
    { orderId: "FZ-2026-DEMO03", name: "كريم فؤاد", phone: "01234567890", planId: "basic", plan: "أساسي", cycle: "monthly", months: 1, total: 570, per: 570, pay: "cash", coach: null, status: "active", ageDays: 3 },
    { orderId: "FZ-2026-DEMO04", name: "سلمى عادل", phone: "01555512345", planId: "pro", plan: "برو", cycle: "quarterly", months: 3, total: 2515, per: 838, pay: "wallet", coach: "mohamed", status: "frozen", ageDays: 70 },
    { orderId: "FZ-2026-DEMO05", name: "يوسف جابر", phone: "01111122233", planId: "pro", plan: "برو", cycle: "monthly", months: 1, total: 912, per: 912, pay: "wallet", coach: "ahmed", status: "cancelled", ageDays: 120 },
    { orderId: "FZ-2026-DEMO06", name: "ريم شريف", phone: "01277788899", planId: "pro", plan: "برو", cycle: "monthly", months: 1, total: 912, per: 912, pay: "wallet", coach: null, status: "pending", ageDays: 0 },
  ];

  const insertSub = db.prepare(
    `INSERT INTO subscriptions
      (order_id, member_name, member_phone, member_goal, plan_id, plan_name, cycle, months, addon_ids, coupon,
       total, per_month, payment_method, payment_ref, paid_at, coach_id, status,
       created_at, updated_at, ends_at, cancelled_at, cancelled_by, cancel_reason)
     VALUES (@orderId, @name, @phone, 'تنشيف', @planId, @plan, @cycle, @months, '[]', NULL,
       @total, @per, @pay, NULL, @paidAt, @coachId, @status,
       @createdAt, @createdAt, @endsAt, @cancelledAt, NULL, @reason)`,
  );
  for (const s of subs) {
    const createdAt = ts - s.ageDays * day;
    insertSub.run({
      orderId: s.orderId,
      name: s.name,
      phone: s.phone,
      planId: s.planId,
      plan: s.plan,
      pay: s.pay,
      cycle: s.cycle,
      months: s.months,
      total: s.total,
      per: s.per,
      coachId: s.coach ? coachOf(s.coach) : null,
      status: s.status,
      paidAt: s.status === "pending" || s.status === "cancelled" ? null : createdAt,
      createdAt,
      endsAt: createdAt + s.months * 30 * day,
      cancelledAt: s.status === "cancelled" ? ts - 5 * day : null,
      reason: s.status === "cancelled" ? "طلب العضو" : null,
    });
  }

  const insertBooking = db.prepare(
    `INSERT INTO bookings (id, name, phone, goal, slot, plan, coach_id, status, notes, created_at, updated_at)
     VALUES (@id, @name, @phone, @goal, @slot, @plan, @coachId, @status, NULL, @ts, @ts)`,
  );
  const bookings = [
    { id: "BK-DEMO01", name: "هدى سعيد", phone: "01023456789", goal: "تخسيس", slot: "٦ م", plan: "حصة تجريبية", coach: "sara", status: "confirmed", ageDays: 1 },
    { id: "BK-DEMO02", name: "طارق حسن", phone: "01098765432", goal: "تضخيم", slot: "٨ م", plan: "استعلام", coach: "ahmed", status: "pending", ageDays: 2 },
    { id: "BK-DEMO03", name: "ندى عمرو", phone: "01277788899", goal: "لياقة", slot: "١٠ ص", plan: "حصة تجريبية", coach: "mohamed", status: "done", ageDays: 6 },
  ];
  for (const b of bookings) {
    insertBooking.run({ ...b, coachId: coachOf(b.coach), ts: ts - b.ageDays * day });
  }
}

/** بتظهر في صفحة الدخول في وضع العرض بس */
export const DEMO_ACCOUNTS = isDemo()
  ? [
      { email: "owner@fitzone.pro", password: DEMO_PASSWORDS.owner, role: "owner" as const },
      { email: "manager@fitzone.pro", password: DEMO_PASSWORDS.admin, role: "admin" as const },
      { email: "coach.ahmed@fitzone.pro", password: DEMO_PASSWORDS.coach, role: "coach" as const },
      { email: "reception@fitzone.pro", password: DEMO_PASSWORDS.reception, role: "reception" as const },
    ]
  : [];

export const demoMode = isDemo;
