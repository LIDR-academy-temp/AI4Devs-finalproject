import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUuid } from '../executions/execution-input';

/** A deduplicated list of tag ids, or undefined when the body leaves tags alone. */
export function parseTagIds(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || !value.every(isUuid)) {
    throw new BadRequestException('tagIds must be an array of tag ids');
  }
  return [...new Set(value as string[])];
}

export interface NamedTag {
  id: string;
  name: string;
}

/** The given tags with their names, by name; 400 unless every one is a tag of this project. */
export async function projectTags(tx: Prisma.TransactionClient, projectId: string, tagIds: string[]): Promise<NamedTag[]> {
  if (tagIds.length === 0) {
    return [];
  }
  const tags = await tx.$queryRaw<NamedTag[]>`
    SELECT id, name FROM tag WHERE id = ANY(${tagIds}::uuid[]) AND project_id = ${projectId}::uuid ORDER BY lower(name)
  `;
  if (tags.length !== tagIds.length) {
    throw new BadRequestException('every tag must be a tag of this project');
  }
  return tags;
}

/** The join tables that carry tags (ADR 0016); a closed set, so safe to name in raw SQL. */
const ITEM_TAG_TABLES = {
  test_case: { table: 'test_case_tag', column: 'test_case_id' },
  bug: { table: 'bug_tag', column: 'bug_id' },
} as const;

export interface SetItemTags {
  item: keyof typeof ITEM_TAG_TABLES;
  itemId: string;
  workspaceId: string;
  projectId: string;
  /** The full set the item should carry. */
  tagIds: string[];
}

/**
 * Makes an item carry exactly `tagIds` (each a tag of the project, else 400), writing
 * only the difference. Returns the names added and removed, for the activity entry.
 */
export async function setItemTags(
  tx: Prisma.TransactionClient,
  { item, itemId, workspaceId, projectId, tagIds }: SetItemTags,
): Promise<{ added: string[]; removed: string[] }> {
  const { table, column } = ITEM_TAG_TABLES[item];
  const joinTable = Prisma.raw(table);
  const itemColumn = Prisma.raw(column);

  const wanted = await projectTags(tx, projectId, tagIds);
  const carried = await tx.$queryRaw<NamedTag[]>`
    SELECT t.id, t.name FROM ${joinTable} j JOIN tag t ON t.id = j.tag_id WHERE j.${itemColumn} = ${itemId}::uuid
    ORDER BY lower(t.name)
  `;
  const added = wanted.filter((tag) => !carried.some((c) => c.id === tag.id));
  const removed = carried.filter((tag) => !tagIds.includes(tag.id));

  if (removed.length > 0) {
    await tx.$executeRaw`
      DELETE FROM ${joinTable} WHERE ${itemColumn} = ${itemId}::uuid AND tag_id = ANY(${removed.map((t) => t.id)}::uuid[])
    `;
  }
  if (added.length > 0) {
    await tx.$executeRaw`
      INSERT INTO ${joinTable} (${itemColumn}, tag_id, workspace_id)
      SELECT ${itemId}::uuid, t.id, ${workspaceId}::uuid FROM unnest(${added.map((t) => t.id)}::uuid[]) AS t(id)
    `;
  }
  return { added: added.map((t) => t.name), removed: removed.map((t) => t.name) };
}
