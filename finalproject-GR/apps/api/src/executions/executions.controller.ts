import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectRoleGuard } from '../common/project-role.guard';
import { RequireProjectRole } from '../common/require-project-role.decorator';
import { PrismaService } from '../common/prisma.service';
import { withTenantContext } from '../common/tenant-context';
import { resolveProjectWorkspaceId } from '../common/resolve-project-workspace';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';
import { EXECUTION_DEFAULTS, isUuid, parseExecutionFields, type Browser } from './execution-input';
import {
  type ExecutionActor,
  type ExecutionResponse,
  listExecutions,
  loadActorDisplayName,
  loadExecution,
  logExecutionActivity,
} from './execution-queries';
import { parseAfterRunId, reorderAfter } from './run-order';

/**
 * Checks every selected test case is a non-deleted, Ready test case of this project
 * (ADR 0012 decision 5). One query; any miss rejects the whole request.
 */
async function assertSelectableTestCases(tx: Prisma.TransactionClient, projectId: string, testCaseIds: string[]) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM test_case
    WHERE id = ANY(${testCaseIds}::uuid[]) AND project_id = ${projectId}::uuid
      AND deleted_at IS NULL AND status = 'Ready'
  `;
  if (rows.length !== testCaseIds.length) {
    throw new BadRequestException('every test case must be a Ready, non-deleted test case of this project');
  }
}

async function loadProjectEnvironment(
  tx: Prisma.TransactionClient,
  projectId: string,
  environmentId: string,
): Promise<{ name: string; default_browser: Browser }> {
  const rows = await tx.$queryRaw<{ name: string; default_browser: Browser }[]>`
    SELECT name, default_browser FROM environment
    WHERE id = ${environmentId}::uuid AND project_id = ${projectId}::uuid
  `;
  if (rows.length === 0) {
    throw new BadRequestException('environmentId must be an environment of this project');
  }
  return rows[0];
}

/** Inserts one Pending run per test case, positions 1..n in the given order. */
async function insertRuns(tx: Prisma.TransactionClient, workspaceId: string, executionId: string, testCaseIds: string[]) {
  await tx.$executeRaw`
    INSERT INTO test_run (execution_id, workspace_id, test_case_id, position)
    SELECT ${executionId}::uuid, ${workspaceId}::uuid, t.id, t.ord
    FROM unnest(${testCaseIds}::uuid[]) WITH ORDINALITY AS t(id, ord)
  `;
}

/**
 * Draft authoring for executions (specs/test-execution-authoring). Lifecycle
 * transitions and run outcomes live in ExecutionLifecycleController.
 */
@Controller('projects/:projectId/executions')
export class ExecutionsController {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(request: AuthenticatedRequest, projectId: string): Promise<ExecutionActor> {
    const userId = request.auth!.userId;
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, userId, projectId);
    const displayName = await loadActorDisplayName(this.prisma, userId);
    return { workspaceId, projectId, userId, displayName };
  }

  @Post()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async create(
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<ExecutionResponse> {
    const fields = parseExecutionFields(body ?? {}, true);
    const testCaseIds = fields.testCaseIds!;
    const actor = await this.actor(request, projectId);

    return withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      await assertSelectableTestCases(tx, projectId, testCaseIds);
      const environment = fields.environmentId ? await loadProjectEnvironment(tx, projectId, fields.environmentId) : null;

      const [execution] = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO test_execution (
          project_id, workspace_id, name, description, environment_id, environment_name, browser,
          viewport_width, viewport_height, locale, timezone, auto_create_bug, created_by
        ) VALUES (
          ${projectId}::uuid, ${actor.workspaceId}::uuid, ${fields.name}, ${fields.description ?? null},
          ${fields.environmentId ?? null}::uuid, ${environment?.name ?? null},
          ${fields.browser ?? environment?.default_browser ?? EXECUTION_DEFAULTS.browser},
          ${fields.viewportWidth ?? EXECUTION_DEFAULTS.viewportWidth},
          ${fields.viewportHeight ?? EXECUTION_DEFAULTS.viewportHeight},
          ${fields.locale ?? EXECUTION_DEFAULTS.locale}, ${fields.timezone ?? EXECUTION_DEFAULTS.timezone},
          ${fields.autoCreateBug ?? false}, ${actor.userId}::uuid
        )
        RETURNING id
      `;
      await insertRuns(tx, actor.workspaceId, execution.id, testCaseIds);
      await logExecutionActivity(tx, actor, 'test_execution.created', {
        type: 'test_execution',
        id: execution.id,
        name: fields.name!,
      });

      return loadExecution(tx, projectId, execution.id);
    });
  }

  @Get()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async list(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest): Promise<ExecutionResponse[]> {
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);
    return withTenantContext(this.prisma, workspaceId, (tx) => listExecutions(tx, projectId));
  }

  @Get(':executionId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async detail(
    @Param('projectId') projectId: string,
    @Param('executionId') executionId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ExecutionResponse> {
    if (!isUuid(executionId)) {
      throw new NotFoundException('execution not found');
    }
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);
    return withTenantContext(this.prisma, workspaceId, (tx) => loadExecution(tx, projectId, executionId));
  }

  /**
   * Edits a Draft execution. A `testCaseIds` list replaces the run list outright
   * (delete + reinsert), so run ids change on every run-list edit — nothing references
   * Draft runs yet (design.md - Risks).
   */
  @Patch(':executionId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async update(
    @Param('projectId') projectId: string,
    @Param('executionId') executionId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<ExecutionResponse> {
    if (!isUuid(executionId)) {
      throw new NotFoundException('execution not found');
    }
    const fields = parseExecutionFields(body ?? {}, false);
    const actor = await this.actor(request, projectId);

    return withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const [current] = await tx.$queryRaw<{ status: string; name: string }[]>`
        SELECT status, name FROM test_execution
        WHERE id = ${executionId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (!current) {
        throw new NotFoundException('execution not found');
      }
      if (current.status !== 'Draft') {
        throw new ConflictException(`only a Draft execution can be edited; this one is ${current.status}`);
      }

      if (fields.testCaseIds) {
        await assertSelectableTestCases(tx, projectId, fields.testCaseIds);
        await tx.$executeRaw`DELETE FROM test_run WHERE execution_id = ${executionId}::uuid`;
        await insertRuns(tx, actor.workspaceId, executionId, fields.testCaseIds);
      }

      const hasEnvironmentUpdate = fields.environmentId !== undefined;
      const environment = fields.environmentId ? await loadProjectEnvironment(tx, projectId, fields.environmentId) : null;
      const hasDescriptionUpdate = fields.description !== undefined;

      await tx.$executeRaw`
        UPDATE test_execution
        SET
          name = COALESCE(${fields.name ?? null}, name),
          description = CASE WHEN ${hasDescriptionUpdate} THEN ${fields.description ?? null} ELSE description END,
          environment_id = CASE WHEN ${hasEnvironmentUpdate} THEN ${fields.environmentId ?? null}::uuid ELSE environment_id END,
          environment_name = CASE WHEN ${hasEnvironmentUpdate} THEN ${environment?.name ?? null} ELSE environment_name END,
          browser = COALESCE(${fields.browser ?? null}, browser),
          viewport_width = COALESCE(${fields.viewportWidth ?? null}::integer, viewport_width),
          viewport_height = COALESCE(${fields.viewportHeight ?? null}::integer, viewport_height),
          locale = COALESCE(${fields.locale ?? null}, locale),
          timezone = COALESCE(${fields.timezone ?? null}, timezone),
          auto_create_bug = COALESCE(${fields.autoCreateBug ?? null}::boolean, auto_create_bug),
          updated_at = now()
        WHERE id = ${executionId}::uuid
      `;

      await logExecutionActivity(
        tx,
        actor,
        'test_execution.updated',
        { type: 'test_execution', id: executionId, name: fields.name ?? current.name },
        { fields: Object.keys(fields) },
      );

      return loadExecution(tx, projectId, executionId);
    });
  }

  /**
   * Moves one run of a Draft execution right after `afterRunId` (first when null) and
   * renumbers positions 1..n. Run ids are kept (ADR 0014, Slice 3 note).
   */
  @Post(':executionId/runs/:runId/move')
  @HttpCode(200)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async moveRun(
    @Param('projectId') projectId: string,
    @Param('executionId') executionId: string,
    @Param('runId') runId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<ExecutionResponse> {
    if (!isUuid(executionId) || !isUuid(runId)) {
      throw new NotFoundException('run not found');
    }
    const afterRunId = parseAfterRunId(body ?? {});
    const actor = await this.actor(request, projectId);

    return withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const [current] = await tx.$queryRaw<{ status: string; name: string }[]>`
        SELECT status, name FROM test_execution
        WHERE id = ${executionId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (!current) {
        throw new NotFoundException('execution not found');
      }
      if (current.status !== 'Draft') {
        throw new ConflictException(`only a Draft execution's runs can be reordered; this one is ${current.status}`);
      }

      const runs = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM test_run WHERE execution_id = ${executionId}::uuid ORDER BY position ASC, id ASC
      `;
      const ids = runs.map((run) => run.id);
      const from = ids.indexOf(runId);
      if (from === -1) {
        throw new NotFoundException('run not found');
      }

      const next = reorderAfter(ids, runId, afterRunId);
      if (next) {
        await tx.$executeRaw`
          UPDATE test_run SET position = t.ord
          FROM unnest(${next}::uuid[]) WITH ORDINALITY AS t(id, ord)
          WHERE test_run.id = t.id
        `;
        await tx.$executeRaw`UPDATE test_execution SET updated_at = now() WHERE id = ${executionId}::uuid`;
        await logExecutionActivity(
          tx,
          actor,
          'test_execution.runs_reordered',
          { type: 'test_execution', id: executionId, name: current.name },
          { runId, fromPosition: from + 1, toPosition: next.indexOf(runId) + 1 },
        );
      }

      return loadExecution(tx, projectId, executionId);
    });
  }

  @Delete(':executionId')
  @HttpCode(204)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Admin')
  async remove(
    @Param('projectId') projectId: string,
    @Param('executionId') executionId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    if (!isUuid(executionId)) {
      throw new NotFoundException('execution not found');
    }
    const actor = await this.actor(request, projectId);

    await withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const [deleted] = await tx.$queryRaw<{ id: string; name: string }[]>`
        UPDATE test_execution
        SET deleted_at = now(), deleted_by = ${actor.userId}::uuid, updated_at = now()
        WHERE id = ${executionId}::uuid AND project_id = ${projectId}::uuid
          AND deleted_at IS NULL AND status = 'Draft'
        RETURNING id, name
      `;
      if (!deleted) {
        const [existing] = await tx.$queryRaw<{ status: string }[]>`
          SELECT status FROM test_execution
          WHERE id = ${executionId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        `;
        if (!existing) {
          throw new NotFoundException('execution not found');
        }
        throw new ConflictException(`only a Draft execution can be deleted; this one is ${existing.status}`);
      }

      await logExecutionActivity(tx, actor, 'test_execution.deleted', {
        type: 'test_execution',
        id: deleted.id,
        name: deleted.name,
      });
    });
  }
}
