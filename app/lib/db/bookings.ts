/** استعلامات الحجوزات. */
import { getDb, now } from ".";

export type BookingStatus = "pending" | "confirmed" | "done" | "no_show" | "cancelled";

export type BookingRow = {
  id: string;
  name: string;
  phone: string;
  goal: string | null;
  slot: string | null;
  plan: string | null;
  coach_id: string | null;
  status: BookingStatus;
  notes: string | null;
  created_at: number;
  updated_at: number;
};

export type Booking = {
  id: string;
  name: string;
  phone: string;
  goal: string;
  slot: string;
  plan: string;
  coachId: string | null;
  coachName: string | null;
  status: BookingStatus;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
};

type JoinedRow = BookingRow & { coach_name: string | null };

const SELECT = "SELECT b.*, u.name AS coach_name FROM bookings b LEFT JOIN users u ON u.id = b.coach_id";

export const toBooking = (r: JoinedRow): Booking => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  goal: r.goal ?? "",
  slot: r.slot ?? "",
  plan: r.plan ?? "",
  coachId: r.coach_id,
  coachName: r.coach_name ?? null,
  status: r.status,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function getBooking(id: string): Booking | null {
  const row = getDb().prepare(`${SELECT} WHERE b.id = ?`).get(id) as JoinedRow | undefined;
  return row ? toBooking(row) : null;
}

export function listBookings(opts: { coachId?: string | null; status?: BookingStatus | "all"; limit?: number; offset?: number } = {}) {
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.coachId) {
    where.push("b.coach_id = @coachId");
    params.coachId = opts.coachId;
  }
  if (opts.status && opts.status !== "all") {
    where.push("b.status = @status");
    params.status = opts.status;
  }
  const clause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  const rows = getDb()
    .prepare(`${SELECT}${clause} ORDER BY b.created_at DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset }) as JoinedRow[];
  const total = (getDb().prepare(`SELECT COUNT(*) AS n FROM bookings b${clause}`).get(params) as { n: number }).n;
  const pending = (
    getDb().prepare(`SELECT COUNT(*) AS n FROM bookings b${clause ? `${clause} AND` : " WHERE"} b.status = 'pending'`).get(params) as { n: number }
  ).n;

  return { items: rows.map(toBooking), total, pending };
}

export function createBooking(input: {
  id: string;
  name: string;
  phone: string;
  goal?: string;
  slot?: string;
  plan?: string;
  coachId?: string | null;
  status?: BookingStatus;
  createdAt?: number;
}): Booking {
  const ts = now();
  getDb()
    .prepare(
      `INSERT INTO bookings (id, name, phone, goal, slot, plan, coach_id, status, notes, created_at, updated_at)
       VALUES (@id, @name, @phone, @goal, @slot, @plan, @coachId, @status, NULL, @createdAt, @ts)
       ON CONFLICT(id) DO UPDATE SET updated_at = @ts`,
    )
    .run({
      id: input.id,
      name: input.name,
      phone: input.phone,
      goal: input.goal ?? null,
      slot: input.slot ?? null,
      plan: input.plan ?? null,
      coachId: input.coachId ?? null,
      status: input.status ?? "confirmed",
      createdAt: input.createdAt ?? ts,
      ts,
    });
  return getBooking(input.id)!;
}

export function updateBooking(id: string, patch: { status?: BookingStatus; coachId?: string | null; notes?: string | null }): Booking | null {
  const current = getBooking(id);
  if (!current) return null;
  getDb()
    .prepare("UPDATE bookings SET status = @status, coach_id = @coachId, notes = @notes, updated_at = @ts WHERE id = @id")
    .run({
      id,
      status: patch.status ?? current.status,
      coachId: patch.coachId === undefined ? current.coachId : patch.coachId,
      notes: patch.notes === undefined ? current.notes : patch.notes,
      ts: now(),
    });
  return getBooking(id);
}

export function deleteBooking(id: string): boolean {
  return getDb().prepare("DELETE FROM bookings WHERE id = ?").run(id).changes > 0;
}

export function bookingStats(coachId?: string | null) {
  const scope = coachId ? " WHERE coach_id = @coachId" : "";
  const params = coachId ? { coachId } : {};
  return getDb()
    .prepare(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) AS confirmed,
        COALESCE(SUM(CASE WHEN status = 'done'      THEN 1 ELSE 0 END), 0) AS done
       FROM bookings${scope}`,
    )
    .get(params) as { total: number; pending: number; confirmed: number; done: number };
}
