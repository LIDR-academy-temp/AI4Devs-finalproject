import { BadRequestException } from '@nestjs/common';
import { isUuid } from './execution-input';

/** Reads a run move body: `afterRunId` is a run id, or null/absent for "first". */
export function parseAfterRunId(body: Record<string, unknown>): string | null {
  const afterRunId = body.afterRunId ?? null;
  if (afterRunId !== null && !isUuid(afterRunId)) {
    throw new BadRequestException('afterRunId must be a run id or null');
  }
  return afterRunId;
}

/**
 * New run order with `runId` placed right after `afterRunId` (first when null), or
 * null when that is where it already is. `ids` is the current order and contains
 * `runId`. 400 when `afterRunId` is the run itself or not one of `ids`.
 */
export function reorderAfter(ids: string[], runId: string, afterRunId: string | null): string[] | null {
  if (afterRunId === runId || (afterRunId !== null && !ids.includes(afterRunId))) {
    throw new BadRequestException('afterRunId must be another run of this execution');
  }
  const rest = ids.filter((id) => id !== runId);
  const index = afterRunId === null ? 0 : rest.indexOf(afterRunId) + 1;
  const next = [...rest.slice(0, index), runId, ...rest.slice(index)];
  return next.every((id, i) => id === ids[i]) ? null : next;
}
