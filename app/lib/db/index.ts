/**
 * الاتصال بقاعدة البيانات (SQLite عبر better-sqlite3) + الميجريشن + الـ seed.
 *
 * ليه SQLite؟ عشان المشروع يفضل «شغّال من غير تجهيز» (زيرو setup) لكن ببيانات حقيقية
 * على القرص بدل مصفوفات in-memory. الاستعلامات كلها معزولة في `app/lib/db/*`،
 * فالانتقال لـ MySQL/Postgres = تبديل الملفات دي بس، من غير لمس أي route أو UI.
 *
 * المتغيرات:
 *   DATABASE_PATH=data/gym.db   مسار الملف (`:memory:` = قاعدة في الذاكرة للاختبارات)
 *   DEMO_SEED=1|0               زرع بيانات تجريبية (افتراضي: شغّال في غير الإنتاج)
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { seedIfEmpty } from "./seed";

export type DB = Database.Database;

type Cache = { db?: DB };
// نفس الاتصال بيتعاد استخدامه بين الـ hot reloads بتاعة next dev
const cache = globalThis as unknown as { __fitzoneDb?: Cache };
cache.__fitzoneDb ??= {};

const MIGRATIONS: string[] = [
  /* 1 — المستخدمون والجلسات وسجل العمليات */
  `
  CREATE TABLE users (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    email                TEXT NOT NULL UNIQUE,
    phone                TEXT,
    role                 TEXT NOT NULL CHECK (role IN ('owner','admin','coach','reception')),
    trainer_slug         TEXT,
    password_hash        TEXT NOT NULL,
    active               INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    failed_attempts      INTEGER NOT NULL DEFAULT 0,
    locked_until         INTEGER NOT NULL DEFAULT 0,
    last_login_at        INTEGER,
    created_at           INTEGER NOT NULL,
    updated_at           INTEGER NOT NULL,
    created_by           TEXT
  );
  CREATE UNIQUE INDEX idx_users_email ON users (email);

  CREATE TABLE sessions (
    id                  TEXT PRIMARY KEY,          -- sha256(token) — التوكن الخام مايتخزنش أبدًا
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_hash           TEXT NOT NULL,             -- sha256(csrf token)
    created_at          INTEGER NOT NULL,
    last_seen_at        INTEGER NOT NULL,
    expires_at          INTEGER NOT NULL,          -- خمول (بيتجدد مع كل طلب)
    absolute_expires_at INTEGER NOT NULL,          -- سقف مطلق مهما حصل
    revoked_at          INTEGER,
    ip                  TEXT,
    user_agent          TEXT
  );
  CREATE INDEX idx_sessions_user ON sessions (user_id);
  CREATE INDEX idx_sessions_exp  ON sessions (expires_at);

  CREATE TABLE audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    at          INTEGER NOT NULL,
    actor_id    TEXT,
    actor_email TEXT,
    actor_role  TEXT,
    action      TEXT NOT NULL,
    entity      TEXT,
    entity_id   TEXT,
    meta        TEXT,
    ip          TEXT
  );
  CREATE INDEX idx_audit_at ON audit_log (at DESC);

  CREATE TABLE rate_limits (
    key           TEXT PRIMARY KEY,
    count         INTEGER NOT NULL DEFAULT 0,
    window_start  INTEGER NOT NULL,
    blocked_until INTEGER NOT NULL DEFAULT 0
  );
  `,

  /* 2 — الاشتراكات والحجوزات */
  `
  CREATE TABLE subscriptions (
    order_id       TEXT PRIMARY KEY,
    member_name    TEXT NOT NULL,
    member_phone   TEXT NOT NULL,
    member_goal    TEXT,
    plan_name      TEXT NOT NULL,
    cycle          TEXT NOT NULL,
    months         INTEGER NOT NULL DEFAULT 1,
    addon_ids      TEXT NOT NULL DEFAULT '[]',
    coupon         TEXT,
    total          INTEGER NOT NULL DEFAULT 0,
    per_month      INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'card',
    payment_ref    TEXT,
    card_brand     TEXT,
    card_last4     TEXT,
    coach_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
    status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','frozen','cancelled','expired')),
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL,
    ends_at        INTEGER NOT NULL,
    cancelled_at   INTEGER,
    cancelled_by   TEXT,
    cancel_reason  TEXT
  );
  CREATE INDEX idx_subs_status ON subscriptions (status);
  CREATE INDEX idx_subs_coach  ON subscriptions (coach_id);
  CREATE INDEX idx_subs_at     ON subscriptions (created_at DESC);

  CREATE TABLE bookings (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL,
    goal       TEXT,
    slot       TEXT,
    plan       TEXT,
    coach_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
    status     TEXT NOT NULL DEFAULT 'confirmed'
               CHECK (status IN ('pending','confirmed','done','no_show','cancelled')),
    notes      TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_bookings_status ON bookings (status);
  CREATE INDEX idx_bookings_coach  ON bookings (coach_id);
  CREATE INDEX idx_bookings_at     ON bookings (created_at DESC);
  `,
];

function migrate(db: DB) {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}

function openDatabase(): DB {
  const configured = (process.env.DATABASE_PATH ?? "").trim() || "data/gym.db";

  const create = (target: string) => {
    if (target !== ":memory:") {
      // turbopackIgnore: المسار بيتحدد وقت التشغيل من متغير بيئة، مش وقت الـ build
      const abs = isAbsolute(target) ? target : resolve(/* turbopackIgnore: true */ process.cwd(), target);
      mkdirSync(dirname(abs), { recursive: true });
      return new Database(abs);
    }
    return new Database(":memory:");
  };

  let db: DB;
  try {
    db = create(configured);
  } catch (e) {
    // على منصات بفايل سيستم للقراءة فقط (Vercel/Lambda) بنكمل بقاعدة في الذاكرة
    console.warn("[db] مش قادر أفتح", configured, "— هرجع لقاعدة في الذاكرة.", (e as Error).message);
    db = new Database(":memory:");
  }

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  return db;
}

/** الاتصال الوحيد بقاعدة البيانات (lazy — أول استدعاء بس هو اللي بيفتح ويعمل migrate + seed) */
export function getDb(): DB {
  if (!cache.__fitzoneDb!.db) {
    const db = openDatabase();
    // الكاش الأول عشان أي استدعاء جوّه الـ seed مايفتحش اتصال تاني
    cache.__fitzoneDb!.db = db;
    try {
      seedIfEmpty(db);
    } catch (e) {
      console.error("[db] seed", e);
    }
  }
  return cache.__fitzoneDb!.db!;
}

/** للاختبارات: يقفل الاتصال ويصفّر الكاش */
export function closeDb() {
  cache.__fitzoneDb?.db?.close();
  if (cache.__fitzoneDb) cache.__fitzoneDb.db = undefined;
}

export const now = () => Date.now();
