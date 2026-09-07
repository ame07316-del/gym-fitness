/**
 * سجل العمليات (Audit log) — كل عملية حساسة بتتسجل: مين، عمل إيه، على مين، وإمتى.
 * ده أهم حاجة في أي لوحة إدارة: الإلغاء والحذف لازم يكون ليهم أثر.
 */
import { getDb, now } from ".";
import type { Role } from "../auth/roles";

export type AuditAction =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.password_changed"
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "subscription.created"
  | "subscription.status_changed"
  | "subscription.coach_assigned"
  | "subscription.deleted"
  | "booking.created"
  | "booking.updated"
  | "booking.deleted";

export type AuditEntry = {
  id: number;
  at: number;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: Role | null;
  action: AuditAction;
  entity: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
};

export function audit(entry: {
  actor?: { id: string; email: string; role: Role } | null;
  action: AuditAction;
  entity?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    getDb()
      .prepare(
        `INSERT INTO audit_log (at, actor_id, actor_email, actor_role, action, entity, entity_id, meta, ip)
         VALUES (@at, @actorId, @actorEmail, @actorRole, @action, @entity, @entityId, @meta, @ip)`,
      )
      .run({
        at: now(),
        actorId: entry.actor?.id ?? null,
        actorEmail: entry.actor?.email ?? null,
        actorRole: entry.actor?.role ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        meta: entry.meta ? JSON.stringify(entry.meta) : null,
        ip: entry.ip ?? null,
      });
  } catch (e) {
    // السجل ما يوقّفش العملية نفسها
    console.error("[audit]", (e as Error).message);
  }
}

export function listAudit(limit = 100, offset = 0): { items: AuditEntry[]; total: number } {
  const rows = getDb()
    .prepare("SELECT * FROM audit_log ORDER BY at DESC, id DESC LIMIT @limit OFFSET @offset")
    .all({ limit: Math.min(Math.max(limit, 1), 300), offset: Math.max(offset, 0) }) as {
    id: number;
    at: number;
    actor_id: string | null;
    actor_email: string | null;
    actor_role: Role | null;
    action: AuditAction;
    entity: string | null;
    entity_id: string | null;
    meta: string | null;
    ip: string | null;
  }[];

  const total = (getDb().prepare("SELECT COUNT(*) AS n FROM audit_log").get() as { n: number }).n;

  return {
    total,
    items: rows.map((r) => ({
      id: r.id,
      at: r.at,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      actorRole: r.actor_role,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      meta: r.meta ? (JSON.parse(r.meta) as Record<string, unknown>) : null,
      ip: r.ip,
    })),
  };
}
