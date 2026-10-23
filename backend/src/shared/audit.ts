// Audit log port shared by every module (README §3.2 "Acceso y auditoría": actions that leave no author elsewhere).
// Each module narrows `action` and `entityType` to its own literals; the adapter lives in infrastructure/.

export interface AuditEntry {
  /** null when the actor is unknown (e.g. a login attempt with a nonexistent userName). */
  userId: number | null
  action: string
  entityType: string
  /** AuditLog.entityId is VARCHAR(64); the adapter cuts longer ids. */
  entityId: string
  detail: Record<string, unknown>
}

export interface AuditLogger {
  record(entry: AuditEntry): Promise<void>
}
