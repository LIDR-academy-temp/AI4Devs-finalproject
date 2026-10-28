import { BadRequestException } from '@nestjs/common';
import { isUuid } from '../executions/execution-input';
import { parseTagIds } from '../tags/tag-queries';

/** Any status may change to any other (ADR 0013 decision 1). */
export type BugStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed' | 'WontFix';
export type BugSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export const BUG_STATUSES: BugStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed', 'WontFix'];
export const BUG_SEVERITIES: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

/** Severity given to auto-created bugs (ADR 0013 decision 2). */
export const AUTO_CREATED_SEVERITY: BugSeverity = 'Medium';

/**
 * The failed step is one trimmed, non-blank line of the snapshot script (ADR 0013
 * decision 4). Returns the value to store, or null when `step` isn't such a line.
 */
export function failedStepOf(script: string | null, step: string): string | null {
  const trimmed = step.trim();
  if (script === null || trimmed === '') {
    return null;
  }
  return script.split(/\r?\n/).some((line) => line.trim() === trimmed) ? trimmed : null;
}

export interface BugCreateInput {
  title: string;
  severity: BugSeverity;
  description: string | null;
  stepsToReproduce: string | null;
  testRunId: string | null;
  failedStep: string | null;
  /** Tags to file it with (ADR 0016); empty = none. */
  tagIds: string[];
}

export interface BugUpdateInput {
  title?: string;
  severity?: BugSeverity;
  status?: BugStatus;
  description?: string | null;
  stepsToReproduce?: string | null;
  /** The full set of tags the bug should carry. */
  tagIds?: string[];
}

function parseTitle(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException('title must be a non-empty string');
  }
  return value;
}

function parseEnum<T extends string>(value: unknown, allowed: T[], field: string): T {
  if (!allowed.includes(value as T)) {
    throw new BadRequestException(`${field} must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

/** Optional free text: absent → undefined, '' or null → null. */
function parseOptionalText(value: unknown, field: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== null && typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string or null`);
  }
  return value === '' ? null : value;
}

export function parseBugCreate(body: Record<string, unknown>): BugCreateInput {
  const testRunId = body.testRunId ?? null;
  if (testRunId !== null && !isUuid(testRunId)) {
    throw new BadRequestException('testRunId must be a test run id');
  }
  const failedStep = body.failedStep ?? null;
  if (failedStep !== null && typeof failedStep !== 'string') {
    throw new BadRequestException('failedStep must be a string');
  }
  if (failedStep !== null && testRunId === null) {
    throw new BadRequestException('failedStep needs a testRunId: it must be a line of the run’s script');
  }
  return {
    title: parseTitle(body.title),
    severity: parseEnum(body.severity, BUG_SEVERITIES, 'severity'),
    description: parseOptionalText(body.description, 'description') ?? null,
    stepsToReproduce: parseOptionalText(body.stepsToReproduce, 'stepsToReproduce') ?? null,
    testRunId,
    failedStep,
    tagIds: parseTagIds(body.tagIds) ?? [],
  };
}

export function parseBugUpdate(body: Record<string, unknown>): BugUpdateInput {
  const input: BugUpdateInput = {};
  if (body.title !== undefined) input.title = parseTitle(body.title);
  if (body.severity !== undefined) input.severity = parseEnum(body.severity, BUG_SEVERITIES, 'severity');
  if (body.status !== undefined) input.status = parseEnum(body.status, BUG_STATUSES, 'status');
  const description = parseOptionalText(body.description, 'description');
  if (description !== undefined) input.description = description;
  const steps = parseOptionalText(body.stepsToReproduce, 'stepsToReproduce');
  if (steps !== undefined) input.stepsToReproduce = steps;
  const tagIds = parseTagIds(body.tagIds);
  if (tagIds !== undefined) input.tagIds = tagIds;
  return input;
}
