import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { withUserContext } from '../common/user-context';
import { log } from '../common/activity-logger';
import type { ExecutionStatus, RunOutcome } from './execution-lifecycle';
import type { Browser } from './execution-input';

/**
 * Read shape shared by the authoring and lifecycle controllers, so both return the
 * same execution response (design.md - two controllers, one resource).
 */

const EXECUTION_COLUMNS = Prisma.sql`
  e.id, e.name, e.description, e.status, e.environment_id, e.environment_name, e.browser,
  e.viewport_width, e.viewport_height, e.locale, e.timezone, e.auto_create_bug,
  e.elapsed_ms_accumulated, e.last_resumed_at, e.started_at, e.completed_at,
  e.signed_off_at, e.signed_off_by, e.created_at, e.updated_at,
  (SELECT COUNT(*) FROM test_run r WHERE r.execution_id = e.id) AS total_runs,
  (SELECT COUNT(*) FROM test_run r WHERE r.execution_id = e.id AND r.outcome <> 'Pending') AS done_runs,
  (SELECT COUNT(*) FROM test_run r WHERE r.execution_id = e.id AND r.outcome = 'Pass') AS pass_runs,
  (SELECT COUNT(*) FROM test_run r WHERE r.execution_id = e.id AND r.outcome = 'Fail') AS fail_runs,
  (SELECT COUNT(*) FROM test_run r WHERE r.execution_id = e.id AND r.outcome = 'NeedsReview') AS needs_review_runs,
  -- Tags its test cases carry now (PRD §6.3.2's tag filter matches on these).
  COALESCE((SELECT array_agg(DISTINCT tt.tag_id) FROM test_run r
            JOIN test_case_tag tt ON tt.test_case_id = r.test_case_id
            WHERE r.execution_id = e.id), '{}') AS tag_ids
`;

interface ExecutionRow {
  id: string;
  name: string;
  description: string | null;
  status: ExecutionStatus;
  environment_id: string | null;
  environment_name: string | null;
  browser: Browser;
  viewport_width: number;
  viewport_height: number;
  locale: string;
  timezone: string;
  auto_create_bug: boolean;
  elapsed_ms_accumulated: bigint;
  last_resumed_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  signed_off_at: Date | null;
  signed_off_by: string | null;
  created_at: Date;
  updated_at: Date;
  total_runs: bigint;
  done_runs: bigint;
  pass_runs: bigint;
  fail_runs: bigint;
  needs_review_runs: bigint;
  tag_ids: string[];
}

interface RunRow {
  id: string;
  position: number;
  test_case_id: string | null;
  name: string | null;
  gherkin_script: string | null;
  test_case_deleted: boolean;
  outcome: RunOutcome;
  outcome_updated_at: Date | null;
}

export interface RunResponse {
  id: string;
  position: number;
  testCaseId: string | null;
  /** The snapshot once started; the test case's current values before that. */
  testCaseName: string | null;
  gherkinScript: string | null;
  /** True when the test case was deleted (or purged) after being added. */
  testCaseDeleted: boolean;
  outcome: RunOutcome;
  outcomeUpdatedAt: string | null;
}

export interface ExecutionResponse {
  id: string;
  name: string;
  description: string | null;
  status: ExecutionStatus;
  environmentId: string | null;
  environmentName: string | null;
  browser: Browser;
  viewportWidth: number;
  viewportHeight: number;
  locale: string;
  timezone: string;
  autoCreateBug: boolean;
  /** Timer (ADR 0005): live elapsed = elapsedMsAccumulated + (now − lastResumedAt) while set. */
  elapsedMsAccumulated: number;
  lastResumedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  signedOffAt: string | null;
  signedOffBy: string | null;
  createdAt: string;
  updatedAt: string;
  counts: { total: number; done: number; pass: number; fail: number; needsReview: number };
  /** Tags currently carried by the test cases of its runs (ADR 0016). */
  tagIds: string[];
  /** Server time when this response was built, so a client can correct for clock skew. */
  now: string;
  runs?: RunResponse[];
}

const iso = (value: Date | null): string | null => (value === null ? null : value.toISOString());

function toResponse(row: ExecutionRow, now: Date, runs?: RunRow[]): ExecutionResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    environmentId: row.environment_id,
    environmentName: row.environment_name,
    browser: row.browser,
    viewportWidth: row.viewport_width,
    viewportHeight: row.viewport_height,
    locale: row.locale,
    timezone: row.timezone,
    autoCreateBug: row.auto_create_bug,
    elapsedMsAccumulated: Number(row.elapsed_ms_accumulated),
    lastResumedAt: iso(row.last_resumed_at),
    startedAt: iso(row.started_at),
    completedAt: iso(row.completed_at),
    signedOffAt: iso(row.signed_off_at),
    signedOffBy: row.signed_off_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    counts: {
      total: Number(row.total_runs),
      done: Number(row.done_runs),
      pass: Number(row.pass_runs),
      fail: Number(row.fail_runs),
      needsReview: Number(row.needs_review_runs),
    },
    tagIds: row.tag_ids,
    now: now.toISOString(),
    runs: runs?.map((run) => ({
      id: run.id,
      position: run.position,
      testCaseId: run.test_case_id,
      testCaseName: run.name,
      gherkinScript: run.gherkin_script,
      testCaseDeleted: run.test_case_deleted,
      outcome: run.outcome,
      outcomeUpdatedAt: iso(run.outcome_updated_at),
    })),
  };
}

/** Lists a project's non-deleted executions, most recently updated first. */
export async function listExecutions(tx: Prisma.TransactionClient, projectId: string): Promise<ExecutionResponse[]> {
  const rows = await tx.$queryRaw<ExecutionRow[]>`
    SELECT ${EXECUTION_COLUMNS} FROM test_execution e
    WHERE e.project_id = ${projectId}::uuid AND e.deleted_at IS NULL
    ORDER BY e.updated_at DESC, e.created_at DESC
  `;
  const now = new Date();
  return rows.map((row) => toResponse(row, now));
}

/** One execution with its runs in position order; 404 if missing or deleted. */
export async function loadExecution(
  tx: Prisma.TransactionClient,
  projectId: string,
  executionId: string,
): Promise<ExecutionResponse> {
  const rows = await tx.$queryRaw<ExecutionRow[]>`
    SELECT ${EXECUTION_COLUMNS} FROM test_execution e
    WHERE e.id = ${executionId}::uuid AND e.project_id = ${projectId}::uuid AND e.deleted_at IS NULL
  `;
  if (rows.length === 0) {
    throw new NotFoundException('execution not found');
  }

  const runs = await tx.$queryRaw<RunRow[]>`
    SELECT r.id, r.position, r.test_case_id, r.outcome, r.outcome_updated_at,
           COALESCE(r.test_case_name_snapshot, tc.name) AS name,
           CASE WHEN r.test_case_name_snapshot IS NOT NULL THEN r.gherkin_script_snapshot ELSE tc.gherkin_script END
             AS gherkin_script,
           (tc.id IS NULL OR tc.deleted_at IS NOT NULL) AS test_case_deleted
    FROM test_run r
    LEFT JOIN test_case tc ON tc.id = r.test_case_id
    WHERE r.execution_id = ${executionId}::uuid
    ORDER BY r.position ASC
  `;

  return toResponse(rows[0], new Date(), runs);
}

/**
 * The acting user's display name for activity entries. "user" is only readable under
 * the user context, so this is looked up before the tenant transaction opens — the
 * same split the credential reveal path uses.
 */
export async function loadActorDisplayName(prisma: PrismaService, userId: string): Promise<string | null> {
  const [actor] = await withUserContext(prisma, userId, (tx) =>
    tx.$queryRaw<{ display_name: string }[]>`SELECT display_name FROM "user" WHERE id = ${userId}::uuid`,
  );
  return actor?.display_name ?? null;
}

export interface ExecutionActor {
  workspaceId: string;
  projectId: string;
  userId: string;
  displayName: string | null;
}

/** Writes one execution-category activity entry in the caller's transaction (ADR 0007). */
export function logExecutionActivity(
  tx: Prisma.TransactionClient,
  actor: ExecutionActor,
  actionCode: string,
  entity: { type: 'test_execution' | 'test_run'; id: string; name: string },
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
    category: 'Executions',
    details,
  });
}
