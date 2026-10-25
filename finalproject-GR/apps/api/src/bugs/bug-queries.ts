import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { log } from '../common/activity-logger';
import type { ExecutionActor } from '../executions/execution-queries';
import type { RunOutcome } from '../executions/execution-lifecycle';
import { AUTO_CREATED_SEVERITY, type BugSeverity, type BugStatus } from './bug-rules';

/**
 * Bug read shape and the SQL shared by the bugs controller and the execution lifecycle
 * controller's auto-creation (ADR 0013). Run and test case links are LEFT JOINed so a
 * soft-deleted target reads as `deleted`, and a purged one as a null link.
 */

const BUG_SELECT = Prisma.sql`
  SELECT b.id, b.title, b.severity, b.status, b.description, b.steps_to_reproduce,
         b.test_case_name_snapshot, b.gherkin_snapshot, b.failed_step_snapshot,
         b.reporter_display_name, b.auto_created, b.created_at, b.updated_at,
         b.test_run_id, r.position AS run_position, r.outcome AS run_outcome,
         e.id AS execution_id, e.name AS execution_name, (e.deleted_at IS NOT NULL) AS execution_deleted,
         b.test_case_id, (tc.deleted_at IS NOT NULL) AS test_case_deleted
  FROM bug b
  LEFT JOIN test_run r ON r.id = b.test_run_id
  LEFT JOIN test_execution e ON e.id = r.execution_id
  LEFT JOIN test_case tc ON tc.id = b.test_case_id
`;

interface BugRow {
  id: string;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  description: string | null;
  steps_to_reproduce: string | null;
  test_case_name_snapshot: string | null;
  gherkin_snapshot: string | null;
  failed_step_snapshot: string | null;
  reporter_display_name: string;
  auto_created: boolean;
  created_at: Date;
  updated_at: Date;
  test_run_id: string | null;
  run_position: number | null;
  run_outcome: RunOutcome | null;
  execution_id: string | null;
  execution_name: string | null;
  execution_deleted: boolean | null;
  test_case_id: string | null;
  test_case_deleted: boolean | null;
}

export interface BugResponse {
  id: string;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  description: string | null;
  stepsToReproduce: string | null;
  testCaseNameSnapshot: string | null;
  gherkinSnapshot: string | null;
  failedStep: string | null;
  reporterName: string;
  autoCreated: boolean;
  createdAt: string;
  updatedAt: string;
  run: {
    id: string;
    executionId: string;
    executionName: string;
    position: number;
    outcome: RunOutcome;
    /** The run's execution was deleted (PRD §2.11: show the link as "deleted"). */
    deleted: boolean;
  } | null;
  testCase: { id: string; deleted: boolean } | null;
}

function toResponse(row: BugRow): BugResponse {
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    description: row.description,
    stepsToReproduce: row.steps_to_reproduce,
    testCaseNameSnapshot: row.test_case_name_snapshot,
    gherkinSnapshot: row.gherkin_snapshot,
    failedStep: row.failed_step_snapshot,
    reporterName: row.reporter_display_name,
    autoCreated: row.auto_created,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    run:
      row.test_run_id && row.execution_id
        ? {
            id: row.test_run_id,
            executionId: row.execution_id,
            executionName: row.execution_name!,
            position: row.run_position!,
            outcome: row.run_outcome!,
            deleted: row.execution_deleted === true,
          }
        : null,
    testCase: row.test_case_id ? { id: row.test_case_id, deleted: row.test_case_deleted === true } : null,
  };
}

export async function listBugs(
  tx: Prisma.TransactionClient,
  projectId: string,
  testRunId: string | null,
): Promise<BugResponse[]> {
  const runFilter = testRunId ? Prisma.sql`AND b.test_run_id = ${testRunId}::uuid` : Prisma.empty;
  const rows = await tx.$queryRaw<BugRow[]>`
    ${BUG_SELECT}
    WHERE b.project_id = ${projectId}::uuid AND b.deleted_at IS NULL ${runFilter}
    ORDER BY b.updated_at DESC, b.created_at DESC
  `;
  return rows.map(toResponse);
}

/** One non-deleted bug of the project; 404 otherwise. */
export async function loadBug(tx: Prisma.TransactionClient, projectId: string, bugId: string): Promise<BugResponse> {
  const rows = await tx.$queryRaw<BugRow[]>`
    ${BUG_SELECT}
    WHERE b.id = ${bugId}::uuid AND b.project_id = ${projectId}::uuid AND b.deleted_at IS NULL
  `;
  if (rows.length === 0) {
    throw new NotFoundException('bug not found');
  }
  return toResponse(rows[0]);
}

export interface StartedRun {
  id: string;
  testCaseId: string | null;
  testCaseName: string | null;
  gherkinScript: string | null;
}

/**
 * A run of a started, non-deleted execution of this project, with the snapshot it
 * recorded at start (ADR 0013 decision 3). Anything else is a 400: the caller named
 * a run that can't carry a bug.
 */
export async function loadStartedRun(
  tx: Prisma.TransactionClient,
  projectId: string,
  runId: string,
): Promise<StartedRun> {
  const rows = await tx.$queryRaw<
    { id: string; test_case_id: string | null; test_case_name_snapshot: string | null; gherkin_script_snapshot: string | null }[]
  >`
    SELECT r.id, r.test_case_id, r.test_case_name_snapshot, r.gherkin_script_snapshot
    FROM test_run r JOIN test_execution e ON e.id = r.execution_id
    WHERE r.id = ${runId}::uuid AND e.project_id = ${projectId}::uuid AND e.deleted_at IS NULL
      AND e.status NOT IN ('Draft', 'Ready')
  `;
  if (rows.length === 0) {
    throw new BadRequestException('testRunId must be a run of a started execution in this project');
  }
  const [row] = rows;
  return {
    id: row.id,
    testCaseId: row.test_case_id,
    testCaseName: row.test_case_name_snapshot,
    gherkinScript: row.gherkin_script_snapshot,
  };
}

/** Writes one Bugs-category activity entry in the caller's transaction (ADR 0007). */
export function logBugActivity(
  tx: Prisma.TransactionClient,
  actor: ExecutionActor,
  actionCode: string,
  bug: { id: string; title: string },
  details?: Record<string, unknown>,
): Promise<void> {
  return log(tx, {
    workspaceId: actor.workspaceId,
    projectId: actor.projectId,
    actorUserId: actor.userId,
    actorDisplayName: actor.displayName,
    actionCode,
    entityType: 'bug',
    entityId: bug.id,
    entityName: bug.title,
    category: 'Bugs',
    details,
  });
}

/**
 * Auto-creates the bug for a run just set to Fail (ADR 0013 decision 2), from the run's
 * own snapshot. The partial unique index on (test_run_id) WHERE auto_created makes a
 * second attempt a no-op, so this logs only when a bug was actually inserted.
 */
export async function autoCreateBugForRun(
  tx: Prisma.TransactionClient,
  actor: ExecutionActor,
  runId: string,
): Promise<void> {
  const inserted = await tx.$queryRaw<{ id: string; title: string }[]>`
    INSERT INTO bug (
      project_id, workspace_id, title, severity, test_run_id, test_case_id,
      test_case_name_snapshot, gherkin_snapshot, reporter_id, reporter_display_name, auto_created
    )
    SELECT ${actor.projectId}::uuid, ${actor.workspaceId}::uuid,
           COALESCE(r.test_case_name_snapshot, 'Failed run'), ${AUTO_CREATED_SEVERITY}, r.id, r.test_case_id,
           r.test_case_name_snapshot, r.gherkin_script_snapshot, ${actor.userId}::uuid,
           ${actor.displayName ?? 'Unknown user'}, true
    FROM test_run r WHERE r.id = ${runId}::uuid
    ON CONFLICT (test_run_id) WHERE auto_created AND deleted_at IS NULL DO NOTHING
    RETURNING id, title
  `;
  if (inserted.length > 0) {
    await logBugActivity(tx, actor, 'bug.created', inserted[0], { auto: true, testRunId: runId });
  }
}
