import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { log } from '../common/activity-logger';
import { keyBetween } from '../common/ordering';
import type { ExecutionActor } from '../executions/execution-queries';
import { ACTIVE_STATUSES } from '../executions/execution-lifecycle';

/**
 * SQL shared by the folders and test-cases controllers: tree shape (depth, height,
 * descendants), ordering keys (ADR 0014) and Test Cases activity entries. All run in
 * the caller's withTenantContext transaction.
 */

export interface FolderRow {
  id: string;
  parent_folder_id: string | null;
  name: string;
  position_key: string;
}

export interface FolderResponse {
  id: string;
  parentFolderId: string | null;
  name: string;
  positionKey: string;
}

export function toFolderResponse(row: FolderRow): FolderResponse {
  return { id: row.id, parentFolderId: row.parent_folder_id, name: row.name, positionKey: row.position_key };
}

/** A non-deleted folder of this project, or null. */
export async function loadFolder(
  tx: Prisma.TransactionClient,
  projectId: string,
  folderId: string,
): Promise<FolderRow | null> {
  const [row] = await tx.$queryRaw<FolderRow[]>`
    SELECT id, parent_folder_id, name, position_key FROM folder
    WHERE id = ${folderId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
  `;
  return row ?? null;
}

/** A target parent must be a live folder of this project (or the root). 400 otherwise. */
export async function assertTargetFolder(tx: Prisma.TransactionClient, projectId: string, folderId: string | null) {
  if (folderId !== null && !(await loadFolder(tx, projectId, folderId))) {
    throw new BadRequestException('the target folder must be a folder of this project');
  }
}

/** Level of a folder: 1 for a root folder; 0 for the root itself (null). */
export async function folderDepth(tx: Prisma.TransactionClient, folderId: string | null): Promise<number> {
  if (folderId === null) {
    return 0;
  }
  const [{ depth }] = await tx.$queryRaw<{ depth: number }[]>`
    WITH RECURSIVE up AS (
      SELECT id, parent_folder_id, 1 AS depth FROM folder WHERE id = ${folderId}::uuid
      UNION ALL
      SELECT f.id, f.parent_folder_id, up.depth + 1 FROM folder f JOIN up ON f.id = up.parent_folder_id
    )
    SELECT max(depth)::int AS depth FROM up
  `;
  return depth;
}

/** Ids of a folder and all its non-deleted descendants, with each one's level below it (1 = itself). */
async function subtree(tx: Prisma.TransactionClient, folderId: string): Promise<{ id: string; level: number }[]> {
  return tx.$queryRaw<{ id: string; level: number }[]>`
    WITH RECURSIVE down AS (
      SELECT id, 1 AS level FROM folder WHERE id = ${folderId}::uuid
      UNION ALL
      SELECT f.id, down.level + 1 FROM folder f JOIN down ON f.parent_folder_id = down.id
      WHERE f.deleted_at IS NULL
    )
    SELECT id, level::int AS level FROM down
  `;
}

/** Levels in a folder's subtree, counting itself (a folder with no subfolders = 1). */
export async function subtreeHeight(tx: Prisma.TransactionClient, folderId: string): Promise<number> {
  return Math.max(...(await subtree(tx, folderId)).map((row) => row.level));
}

/** True when `candidateId` is `folderId` itself or one of its descendants. */
export async function isSelfOrDescendant(
  tx: Prisma.TransactionClient,
  folderId: string,
  candidateId: string,
): Promise<boolean> {
  return (await subtree(tx, folderId)).some((row) => row.id === candidateId);
}

/** Every folder id in the subtree, and the live test cases inside them. */
export async function subtreeContents(
  tx: Prisma.TransactionClient,
  folderId: string,
): Promise<{ folderIds: string[]; testCaseIds: string[] }> {
  const folderIds = (await subtree(tx, folderId)).map((row) => row.id);
  const testCases = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM test_case WHERE folder_id = ANY(${folderIds}::uuid[]) AND deleted_at IS NULL
  `;
  return { folderIds, testCaseIds: testCases.map((row) => row.id) };
}

/** Names of Ready/InProgress/Paused executions holding any of these test cases (ADR 0012). */
export async function activeExecutionsFor(tx: Prisma.TransactionClient, testCaseIds: string[]): Promise<string[]> {
  if (testCaseIds.length === 0) {
    return [];
  }
  const rows = await tx.$queryRaw<{ name: string }[]>`
    SELECT DISTINCT e.name FROM test_run r JOIN test_execution e ON e.id = r.execution_id
    WHERE r.test_case_id = ANY(${testCaseIds}::uuid[]) AND e.deleted_at IS NULL
      AND e.status = ANY(${ACTIVE_STATUSES}::text[])
    ORDER BY e.name
  `;
  return rows.map((row) => row.name);
}

type OrderedTable = 'folder' | 'test_case';

/** Column holding the parent folder in each ordered table. */
const PARENT_COLUMN: Record<OrderedTable, string> = { folder: 'parent_folder_id', test_case: 'folder_id' };

function siblingsOf(table: OrderedTable, projectId: string, parentId: string | null, excludeId: string | null) {
  const parent = Prisma.raw(PARENT_COLUMN[table]);
  return Prisma.sql`
    FROM ${Prisma.raw(table)}
    WHERE project_id = ${projectId}::uuid AND deleted_at IS NULL
      AND ${parent} IS NOT DISTINCT FROM ${parentId}::uuid
      AND id IS DISTINCT FROM ${excludeId}::uuid
  `;
}

/** Key placing a new item last among its same-kind siblings. */
export async function keyForAppend(
  tx: Prisma.TransactionClient,
  table: OrderedTable,
  projectId: string,
  parentId: string | null,
): Promise<string> {
  const [{ last }] = await tx.$queryRaw<{ last: string | null }[]>`
    SELECT max(position_key) AS last ${siblingsOf(table, projectId, parentId, null)}
  `;
  return keyBetween(last, null);
}

/**
 * Key placing an item right after `afterId` (or first, when null) among its new
 * same-kind siblings, excluding the item itself. 400 when `afterId` isn't one of them.
 */
export async function keyForMove(
  tx: Prisma.TransactionClient,
  table: OrderedTable,
  projectId: string,
  parentId: string | null,
  afterId: string | null,
  movingId: string,
): Promise<string> {
  const siblings = siblingsOf(table, projectId, parentId, movingId);
  let afterKey: string | null = null;
  if (afterId !== null) {
    const [after] = await tx.$queryRaw<{ position_key: string }[]>`
      SELECT position_key ${siblings} AND id = ${afterId}::uuid
    `;
    if (!after) {
      throw new BadRequestException('afterId must be a sibling of the same kind in the target folder');
    }
    afterKey = after.position_key;
  }
  // Strictly greater, so an equal-key tie never yields an empty interval.
  const [{ next }] = afterKey === null
    ? await tx.$queryRaw<{ next: string | null }[]>`SELECT min(position_key) AS next ${siblings}`
    : await tx.$queryRaw<{ next: string | null }[]>`
        SELECT min(position_key) AS next ${siblings} AND position_key > ${afterKey}
      `;
  return keyBetween(afterKey, next);
}

/** Writes one Test Cases-category activity entry in the caller's transaction (ADR 0007). */
export function logTreeActivity(
  tx: Prisma.TransactionClient,
  actor: ExecutionActor,
  actionCode: string,
  entity: { type: 'folder' | 'test_case'; id: string; name: string },
  details?: Record<string, unknown>,
): Promise<void> {
  return log(tx, {
    workspaceId: actor.workspaceId,
    projectId: actor.projectId,
    actorUserId: actor.userId,
    actorDisplayName: actor.displayName,
    actionCode,
    entityType: entity.type,
    entityId: entity.id,
    entityName: entity.name,
    category: 'Test Cases',
    details,
  });
}

/** Postgres unique violation (e.g. folder_sibling_name_idx), as surfaced by Prisma raw queries. */
export function isUniqueViolation(error: unknown): boolean {
  const text = String((error as { message?: string })?.message ?? error);
  return text.includes('23505') || text.includes('unique constraint');
}
