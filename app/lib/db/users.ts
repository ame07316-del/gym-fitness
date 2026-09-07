/** استعلامات المستخدمين — كل SQL خاص بالمستخدمين موجود هنا وبس. */
import { randomUUID } from "node:crypto";
import { getDb, now } from ".";
import type { Role } from "../auth/roles";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  trainer_slug: string | null;
  password_hash: string;
  active: number;
  must_change_password: number;
  failed_attempts: number;
  locked_until: number;
  last_login_at: number | null;
  created_at: number;
  updated_at: number;
  created_by: string | null;
};

/** الشكل اللي بيتبعت للواجهة — من غير هاش كلمة السر ولا عدادات القفل */
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  trainerSlug: string | null;
  active: boolean;
  mustChangePassword: boolean;
  lockedUntil: number;
  lastLoginAt: number | null;
  createdAt: number;
};

export const toPublicUser = (u: UserRow): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  trainerSlug: u.trainer_slug,
  active: u.active === 1,
  mustChangePassword: u.must_change_password === 1,
  lockedUntil: u.locked_until,
  lastLoginAt: u.last_login_at,
  createdAt: u.created_at,
});

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function findUserByEmail(email: string): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE email = ?").get(normalizeEmail(email)) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function listUsers(): PublicUser[] {
  const rows = getDb()
    .prepare("SELECT * FROM users ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'coach' THEN 2 ELSE 3 END, name")
    .all() as UserRow[];
  return rows.map(toPublicUser);
}

export function listCoaches(): { id: string; name: string; trainerSlug: string | null }[] {
  return getDb()
    .prepare("SELECT id, name, trainer_slug AS trainerSlug FROM users WHERE role = 'coach' AND active = 1 ORDER BY name")
    .all() as { id: string; name: string; trainerSlug: string | null }[];
}

export function countOwners(excludeId?: string): number {
  const row = excludeId
    ? (getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner' AND active = 1 AND id <> ?").get(excludeId) as { n: number })
    : (getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner' AND active = 1").get() as { n: number });
  return row.n;
}

export function createUser(input: {
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  trainerSlug?: string | null;
  passwordHash: string;
  mustChangePassword?: boolean;
  createdBy?: string | null;
}): PublicUser {
  const ts = now();
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO users (id, name, email, phone, role, trainer_slug, password_hash, active, must_change_password, created_at, updated_at, created_by)
       VALUES (@id, @name, @email, @phone, @role, @trainerSlug, @passwordHash, 1, @mustChange, @ts, @ts, @createdBy)`,
    )
    .run({
      id,
      name: input.name,
      email: normalizeEmail(input.email),
      phone: input.phone ?? null,
      role: input.role,
      trainerSlug: input.trainerSlug ?? null,
      passwordHash: input.passwordHash,
      mustChange: input.mustChangePassword ? 1 : 0,
      ts,
      createdBy: input.createdBy ?? null,
    });
  return toPublicUser(findUserById(id)!);
}

export function updateUser(
  id: string,
  patch: Partial<{ name: string; phone: string | null; role: Role; trainerSlug: string | null; active: boolean; passwordHash: string; mustChangePassword: boolean }>,
): PublicUser | null {
  const current = findUserById(id);
  if (!current) return null;

  const next = {
    name: patch.name ?? current.name,
    phone: patch.phone === undefined ? current.phone : patch.phone,
    role: patch.role ?? current.role,
    trainerSlug: patch.trainerSlug === undefined ? current.trainer_slug : patch.trainerSlug,
    active: patch.active === undefined ? current.active : patch.active ? 1 : 0,
    passwordHash: patch.passwordHash ?? current.password_hash,
    mustChange: patch.mustChangePassword === undefined ? current.must_change_password : patch.mustChangePassword ? 1 : 0,
    // تغيير كلمة السر أو تعطيل الحساب بيصفّر عداد المحاولات والقفل
    resetLock: patch.passwordHash || patch.active !== undefined ? 1 : 0,
    ts: now(),
    id,
  };

  getDb()
    .prepare(
      `UPDATE users SET
        name = @name, phone = @phone, role = @role, trainer_slug = @trainerSlug,
        active = @active, password_hash = @passwordHash, must_change_password = @mustChange,
        failed_attempts = CASE WHEN @resetLock = 1 THEN 0 ELSE failed_attempts END,
        locked_until    = CASE WHEN @resetLock = 1 THEN 0 ELSE locked_until END,
        updated_at = @ts
       WHERE id = @id`,
    )
    .run(next);

  return toPublicUser(findUserById(id)!);
}

export function deleteUser(id: string): boolean {
  const res = getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
  return res.changes > 0;
}

/* ==================== قفل المحاولات الفاشلة ==================== */

export const LOCK_AFTER_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export function registerFailedLogin(id: string): { lockedUntil: number } {
  const db = getDb();
  const ts = now();
  db.prepare(
    `UPDATE users SET
       failed_attempts = failed_attempts + 1,
       locked_until = CASE WHEN failed_attempts + 1 >= @limit THEN @until ELSE locked_until END,
       updated_at = @ts
     WHERE id = @id`,
  ).run({ id, limit: LOCK_AFTER_ATTEMPTS, until: ts + LOCK_MINUTES * 60_000, ts });
  const row = findUserById(id);
  return { lockedUntil: row?.locked_until ?? 0 };
}

export function registerSuccessfulLogin(id: string) {
  getDb()
    .prepare("UPDATE users SET failed_attempts = 0, locked_until = 0, last_login_at = @ts, updated_at = @ts WHERE id = @id")
    .run({ id, ts: now() });
}

export const isLocked = (u: UserRow) => u.locked_until > now();
