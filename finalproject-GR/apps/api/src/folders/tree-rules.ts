import { BadRequestException } from '@nestjs/common';
import { isUuid } from '../executions/execution-input';

/** PRD §2.3 (amended 2026-10-25): a root folder is level 1; nothing deeper than 4. */
export const MAX_FOLDER_DEPTH = 4;

/**
 * Whether a folder subtree of `subtreeHeight` levels (1 = the folder alone) fits under
 * a parent at `parentDepth` (0 = the root).
 */
export function fitsDepth(parentDepth: number, subtreeHeight: number): boolean {
  return parentDepth + subtreeHeight <= MAX_FOLDER_DEPTH;
}

export function parseFolderName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException('name must be a non-empty string');
  }
  return value.trim();
}

/** null = the root; otherwise a folder id. */
export function parseParentId(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isUuid(value)) {
    throw new BadRequestException(`${field} must be a folder id or null`);
  }
  return value;
}

export interface MoveTarget {
  parentFolderId: string | null;
  /** The sibling (same kind) the item goes after; null = first. */
  afterId: string | null;
}

export function parseMoveTarget(body: Record<string, unknown>, parentField: 'parentFolderId' | 'folderId'): MoveTarget {
  const afterId = body.afterId ?? null;
  if (afterId !== null && !isUuid(afterId)) {
    throw new BadRequestException('afterId must be an id or null');
  }
  return { parentFolderId: parseParentId(body[parentField], parentField), afterId };
}
