import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectRoleGuard } from '../common/project-role.guard';
import { RequireProjectRole } from '../common/require-project-role.decorator';
import { PrismaService } from '../common/prisma.service';
import { withTenantContext } from '../common/tenant-context';
import { resolveProjectWorkspaceId } from '../common/resolve-project-workspace';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';
import {
  completesExecution,
  type ExecutionStatus,
  type LifecycleAction,
  OUTCOME_EDITABLE_STATUSES,
  type RunOutcome,
  TRANSITIONS,
} from './execution-lifecycle';
import { isUuid, parseOutcome, parseRunMode } from './execution-input';
import {
  type ExecutionActor,
  type ExecutionResponse,
  loadActorDisplayName,
  loadExecution,
  logExecutionActivity,
} from './execution-queries';
import { autoCreateBugForRun } from '../bugs/bug-queries';

/** Adds the current InProgress period to the accumulator (ADR 0005 timer model). */
const STOP_TIMER = Prisma.sql`
  elapsed_ms_accumulated = elapsed_ms_accumulated
    + COALESCE((EXTRACT(EPOCH FROM (now() - last_resumed_at)) * 1000)::bigint, 0),
  last_resumed_at = NULL
`;

/**
 * What each action writes besides `status`, plus an optional precondition checked in
 * the same UPDATE's WHERE clause and the message used when only that precondition
 * failed (design.md - State machine as one table-driven module plus conditional UPDATEs).
 */
interface ActionSql {
  set: (userId: string) => Prisma.Sql;
  precondition?: (executionId: string) => Prisma.Sql;
  preconditionMessage?: string;
}

const ACTION_SQL: Record<LifecycleAction, ActionSql> = {
  markReady: {
    set: () => Prisma.empty,
    // ADR 0012 decisions 4-5: every run's test case still exists and is still Ready.
    precondition: (executionId) => Prisma.sql`NOT EXISTS (
      SELECT 1 FROM test_run r LEFT JOIN test_case tc ON tc.id = r.test_case_id
      WHERE r.execution_id = ${executionId}::uuid
        AND (tc.id IS NULL OR tc.deleted_at IS NOT NULL OR tc.status <> 'Ready')
    )`,
    preconditionMessage: 'every test case in the execution must still exist and be Ready',
  },
  backToDraft: { set: () => Prisma.empty },
  runAll: {
    set: () => Prisma.sql`, started_at = now(), last_resumed_at = now()`,
    precondition: (executionId) => Prisma.sql`EXISTS (SELECT 1 FROM test_run WHERE execution_id = ${executionId}::uuid)`,
    preconditionMessage: 'add at least one test case before running the execution',
  },
  pause: { set: () => Prisma.sql`, ${STOP_TIMER}` },
  resume: { set: () => Prisma.sql`, last_resumed_at = now()` },
  signOff: {
    set: (userId) => Prisma.sql`, signed_off_at = now(), signed_off_by = ${userId}::uuid`,
    precondition: (executionId) => Prisma.sql`NOT EXISTS (
      SELECT 1 FROM test_run WHERE execution_id = ${executionId}::uuid AND outcome = 'NeedsReview'
    )`,
    preconditionMessage: 'resolve every Needs Review run to Pass or Fail before signing off',
  },
};

/**
 * Lifecycle transitions and manual run outcomes (specs/test-execution-lifecycle).
 * Each transition is one conditional UPDATE guarded on the expected status, so of two
 * concurrent conflicting requests exactly one wins and the other gets 409.
 */
@Controller('projects/:projectId/executions/:executionId')
export class ExecutionLifecycleController {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(request: AuthenticatedRequest, projectId: string): Promise<ExecutionActor> {
    const userId = request.auth!.userId;
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, userId, projectId);
    const displayName = await loadActorDisplayName(this.prisma, userId);
    return { workspaceId, projectId, userId, displayName };
  }

  private async transition(
    action: LifecycleAction,
    projectId: string,
    executionId: string,
    request: AuthenticatedRequest,
    afterTransition?: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<ExecutionResponse> {
    if (!isUuid(executionId)) {
      throw new NotFoundException('execution not found');
    }
    const { from, to, actionCode } = TRANSITIONS[action];
    const sql = ACTION_SQL[action];
    const actor = await this.actor(request, projectId);

    return withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const precondition = sql.precondition ? Prisma.sql`AND ${sql.precondition(executionId)}` : Prisma.empty;
      const [updated] = await tx.$queryRaw<{ id: string; name: string }[]>`
        UPDATE test_execution
        SET status = ${to}, updated_at = now() ${sql.set(actor.userId)}
        WHERE id = ${executionId}::uuid AND project_id = ${projectId}::uuid
          AND deleted_at IS NULL AND status = ${from} ${precondition}
        RETURNING id, name
      `;

      if (!updated) {
        const [existing] = await tx.$queryRaw<{ status: ExecutionStatus }[]>`
          SELECT status FROM test_execution
          WHERE id = ${executionId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        `;
        if (!existing) {
          throw new NotFoundException('execution not found');
        }
        if (existing.status !== from) {
          throw new ConflictException(`cannot ${action} an execution that is ${existing.status}`);
        }
        throw new ConflictException(sql.preconditionMessage);
      }

      await afterTransition?.(tx);
      await logExecutionActivity(
        tx,
        actor,
        actionCode,
        { type: 'test_execution', id: updated.id, name: updated.name },
        { from, to },
      );
      return loadExecution(tx, projectId, executionId);
    });
  }

  @Post('mark-ready')
  @HttpCode(200)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(TRANSITIONS.markReady.minRole)
  markReady(@Param('projectId') projectId: string, @Param('executionId') executionId: string, @Req() request: AuthenticatedRequest) {
    return this.transition('markReady', projectId, executionId, request);
  }

  @Post('back-to-draft')
  @HttpCode(200)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(TRANSITIONS.backToDraft.minRole)
  backToDraft(@Param('projectId') projectId: string, @Param('executionId') executionId: string, @Req() request: AuthenticatedRequest) {
    return this.transition('backToDraft', projectId, executionId, request);
  }

  @Post('run-all')
  @HttpCode(200)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(TRANSITIONS.runAll.minRole)
  runAll(
    @Param('projectId') projectId: string,
    @Param('executionId') executionId: string,
    @Body() body: { mode?: unknown },
    @Req() request: AuthenticatedRequest,
  ) {
    if (parseRunMode(body?.mode) === 'Automated') {
      throw new UnprocessableEntityException('Automated mode is currently unavailable; run the execution in Manual mode');
    }
    // Snapshot-on-start (PRD §6.3.4): one statement, same transaction as the status change.
    return this.transition('runAll', projectId, executionId, request, async (tx) => {
      await tx.$executeRaw`
        UPDATE test_run r
        SET test_case_name_snapshot = tc.name, gherkin_script_snapshot = tc.gherkin_script
        FROM test_case tc
        WHERE r.execution_id = ${executionId}::uuid AND tc.id = r.test_case_id
      `;
    });
  }

  @Post('pause')
  @HttpCode(200)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(TRANSITIONS.pause.minRole)
  pause(@Param('projectId') projectId: string, @Param('executionId') executionId: string, @Req() request: AuthenticatedRequest) {
    return this.transition('pause', projectId, executionId, request);
  }

  @Post('resume')
  @HttpCode(200)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(TRANSITIONS.resume.minRole)
  resume(@Param('projectId') projectId: string, @Param('executionId') executionId: string, @Req() request: AuthenticatedRequest) {
    return this.transition('resume', projectId, executionId, request);
  }

  @Post('sign-off')
  @HttpCode(200)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(TRANSITIONS.signOff.minRole)
  signOff(@Param('projectId') projectId: string, @Param('executionId') executionId: string, @Req() request: AuthenticatedRequest) {
    return this.transition('signOff', projectId, executionId, request);
  }

  /**
   * Records a manual outcome. Locks the execution row first so outcome writes on one
   * execution are serialized — otherwise two testers recording the last two outcomes
   * could each still see the other's run as Pending and neither would complete it.
   */
  @Patch('runs/:runId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async setOutcome(
    @Param('projectId') projectId: string,
    @Param('executionId') executionId: string,
    @Param('runId') runId: string,
    @Body() body: { outcome?: unknown },
    @Req() request: AuthenticatedRequest,
  ): Promise<ExecutionResponse> {
    const outcome = parseOutcome(body?.outcome);
    if (!isUuid(executionId) || !isUuid(runId)) {
      throw new NotFoundException('run not found');
    }
    const actor = await this.actor(request, projectId);

    return withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const [execution] = await tx.$queryRaw<
        { id: string; name: string; status: ExecutionStatus; auto_create_bug: boolean }[]
      >`
        SELECT id, name, status, auto_create_bug FROM test_execution
        WHERE id = ${executionId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (!execution) {
        throw new NotFoundException('execution not found');
      }
      if (!OUTCOME_EDITABLE_STATUSES.includes(execution.status)) {
        throw new ConflictException(`outcomes cannot be recorded while the execution is ${execution.status}`);
      }

      const [run] = await tx.$queryRaw<{ outcome: RunOutcome; name: string | null }[]>`
        SELECT r.outcome, COALESCE(r.test_case_name_snapshot, tc.name) AS name
        FROM test_run r LEFT JOIN test_case tc ON tc.id = r.test_case_id
        WHERE r.id = ${runId}::uuid AND r.execution_id = ${executionId}::uuid
      `;
      if (!run) {
        throw new NotFoundException('run not found');
      }

      await tx.$executeRaw`
        UPDATE test_run
        SET outcome = ${outcome}, outcome_updated_at = now(), outcome_updated_by = ${actor.userId}::uuid
        WHERE id = ${runId}::uuid
      `;
      await tx.$executeRaw`UPDATE test_execution SET updated_at = now() WHERE id = ${executionId}::uuid`;
      await logExecutionActivity(
        tx,
        actor,
        'test_run.outcome_set',
        { type: 'test_run', id: runId, name: run.name ?? '(deleted test case)' },
        { executionId, from: run.outcome, to: outcome },
      );
      // ADR 0013 decision 2: same transaction, at most once per run (DB-enforced).
      if (outcome === 'Fail' && execution.auto_create_bug) {
        await autoCreateBugForRun(tx, actor, runId);
      }

      const [{ pending }] = await tx.$queryRaw<{ pending: bigint }[]>`
        SELECT COUNT(*) AS pending FROM test_run WHERE execution_id = ${executionId}::uuid AND outcome = 'Pending'
      `;
      if (completesExecution(execution.status, Number(pending))) {
        await tx.$executeRaw`
          UPDATE test_execution
          SET status = 'Completed', completed_at = now(), updated_at = now(), ${STOP_TIMER}
          WHERE id = ${executionId}::uuid
        `;
        await logExecutionActivity(
          tx,
          actor,
          'test_execution.completed',
          { type: 'test_execution', id: executionId, name: execution.name },
          { from: 'InProgress', to: 'Completed' },
        );
      }

      return loadExecution(tx, projectId, executionId);
    });
  }
}
