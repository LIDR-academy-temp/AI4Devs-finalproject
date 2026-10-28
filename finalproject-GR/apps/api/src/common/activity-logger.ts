import { Prisma } from '@prisma/client';

export interface ActivityLogEntry {
  workspaceId: string;
  projectId?: string | null;
  actorUserId?: string | null;
  /** Must be set together with actorUserId, or both left null (system action). */
  actorDisplayName?: string | null;
  actionCode: string;
  entityType: string;
  entityId: string;
  entityName: string;
  category: string;
  details?: Record<string, unknown>;
}

/**
 * Writes one activity entry using the caller's own transaction (ADR 0007) — never opens
 * a transaction of its own. The caller is already inside a withTenantContext (ADR 0008)
 * transaction; this just adds one more statement to it.
 */
export async function log(tx: Prisma.TransactionClient, entry: ActivityLogEntry): Promise<void> {
  const detailsJson = entry.details === undefined ? null : JSON.stringify(entry.details);

  await tx.$executeRaw`
    INSERT INTO activity_entries (
      workspace_id, project_id, actor_user_id, actor_display_name,
      action_code, entity_type, entity_id, entity_name, category, details
    ) VALUES (
      ${entry.workspaceId}::uuid,
      ${entry.projectId ?? null}::uuid,
      ${entry.actorUserId ?? null}::uuid,
      ${entry.actorDisplayName ?? null},
      ${entry.actionCode},
      ${entry.entityType},
      ${entry.entityId}::uuid,
      ${entry.entityName},
      ${entry.category},
      ${detailsJson}::jsonb
    )
  `;
}
