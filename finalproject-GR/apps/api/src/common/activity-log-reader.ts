import { Prisma } from '@prisma/client';

export interface ActivityKeysetCursor {
  createdAt: Date;
  id: string;
}

export interface ListActivityEntriesParams {
  workspaceId: string;
  /** Omit to read across the whole workspace; set to scope to one project. */
  projectId?: string;
  /** Omit for the first page. */
  after?: ActivityKeysetCursor;
  limit?: number;
}

export interface ActivityEntryRow {
  id: string;
  workspace_id: string;
  project_id: string | null;
  actor_user_id: string | null;
  actor_display_name: string | null;
  action_code: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  category: string;
  details: unknown;
  created_at: Date;
}

/**
 * Keyset pagination, never offset (ADR 0007 / PRD §6.6): newest first, matching the
 * (workspace_id, project_id, created_at desc, id) index from the migration.
 */
export async function listActivityEntries(
  tx: Prisma.TransactionClient,
  { workspaceId, projectId, after, limit = 20 }: ListActivityEntriesParams,
): Promise<ActivityEntryRow[]> {
  const projectFilter = projectId ? Prisma.sql`AND project_id = ${projectId}::uuid` : Prisma.empty;
  const cursorFilter = after
    ? Prisma.sql`AND (created_at, id) < (${after.createdAt}, ${after.id}::uuid)`
    : Prisma.empty;

  return tx.$queryRaw<ActivityEntryRow[]>`
    SELECT id, workspace_id, project_id, actor_user_id, actor_display_name,
           action_code, entity_type, entity_id, entity_name, category, details, created_at
    FROM activity_entries
    WHERE workspace_id = ${workspaceId}::uuid
    ${projectFilter}
    ${cursorFilter}
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit}
  `;
}
