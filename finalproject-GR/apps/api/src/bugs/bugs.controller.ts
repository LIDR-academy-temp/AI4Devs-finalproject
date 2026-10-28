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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectRoleGuard } from '../common/project-role.guard';
import { RequireProjectRole } from '../common/require-project-role.decorator';
import { PrismaService } from '../common/prisma.service';
import { withTenantContext } from '../common/tenant-context';
import { resolveProjectWorkspaceId } from '../common/resolve-project-workspace';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';
import { isUuid } from '../executions/execution-input';
import { type ExecutionActor, loadActorDisplayName } from '../executions/execution-queries';
import { type BugSeverity, type BugStatus, failedStepOf, parseBugCreate, parseBugUpdate } from './bug-rules';
import { type BugResponse, listBugs, loadBug, loadStartedRun, logBugActivity } from './bug-queries';
import { projectTags, setItemTags } from '../tags/tag-queries';

/** Bugs (specs/bug-tracking). Auto-creation on Fail lives in ExecutionLifecycleController. */
@Controller('projects/:projectId/bugs')
export class BugsController {
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
  ): Promise<BugResponse> {
    const input = parseBugCreate(body ?? {});
    const actor = await this.actor(request, projectId);

    return withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      // The snapshot always comes from the run, never the request (ADR 0013 decision 3).
      const run = input.testRunId ? await loadStartedRun(tx, projectId, input.testRunId) : null;
      let failedStep: string | null = null;
      if (input.failedStep !== null) {
        failedStep = failedStepOf(run?.gherkinScript ?? null, input.failedStep);
        if (failedStep === null) {
          throw new BadRequestException('failedStep must be one line of the run’s Gherkin script');
        }
      }

      // Checked before the insert, so a bad tag leaves no bug behind.
      const tags = await projectTags(tx, projectId, input.tagIds);
      const [bug] = await tx.$queryRaw<{ id: string; title: string }[]>`
        INSERT INTO bug (
          project_id, workspace_id, title, severity, description, steps_to_reproduce,
          test_run_id, test_case_id, test_case_name_snapshot, gherkin_snapshot, failed_step_snapshot,
          reporter_id, reporter_display_name
        ) VALUES (
          ${projectId}::uuid, ${actor.workspaceId}::uuid, ${input.title}, ${input.severity},
          ${input.description}, ${input.stepsToReproduce},
          ${run?.id ?? null}::uuid, ${run?.testCaseId ?? null}::uuid, ${run?.testCaseName ?? null},
          ${run?.gherkinScript ?? null}, ${failedStep},
          ${actor.userId}::uuid, ${actor.displayName ?? 'Unknown user'}
        )
        RETURNING id, title
      `;
      if (tags.length > 0) {
        await setItemTags(tx, { item: 'bug', itemId: bug.id, workspaceId: actor.workspaceId, projectId, tagIds: input.tagIds });
      }
      const details = { ...(run ? { testRunId: run.id } : {}), ...(tags.length > 0 ? { tags: tags.map((t) => t.name) } : {}) };
      await logBugActivity(tx, actor, 'bug.created', bug, Object.keys(details).length > 0 ? details : undefined);
      return loadBug(tx, projectId, bug.id);
    });
  }

  @Get()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async list(
    @Param('projectId') projectId: string,
    @Query('testRunId') testRunId: string | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<BugResponse[]> {
    if (testRunId !== undefined && !isUuid(testRunId)) {
      throw new BadRequestException('testRunId must be a test run id');
    }
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);
    return withTenantContext(this.prisma, workspaceId, (tx) => listBugs(tx, projectId, testRunId ?? null));
  }

  @Get(':bugId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async detail(
    @Param('projectId') projectId: string,
    @Param('bugId') bugId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<BugResponse> {
    if (!isUuid(bugId)) {
      throw new NotFoundException('bug not found');
    }
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);
    return withTenantContext(this.prisma, workspaceId, (tx) => loadBug(tx, projectId, bugId));
  }

  /** Edits fields, severity and status — any status to any other (ADR 0013 decision 1). */
  @Patch(':bugId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async update(
    @Param('projectId') projectId: string,
    @Param('bugId') bugId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<BugResponse> {
    if (!isUuid(bugId)) {
      throw new NotFoundException('bug not found');
    }
    const input = parseBugUpdate(body ?? {});
    const actor = await this.actor(request, projectId);

    return withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const [current] = await tx.$queryRaw<
        {
          title: string;
          severity: BugSeverity;
          status: BugStatus;
          description: string | null;
          steps_to_reproduce: string | null;
        }[]
      >`
        SELECT title, severity, status, description, steps_to_reproduce FROM bug
        WHERE id = ${bugId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (!current) {
        throw new NotFoundException('bug not found');
      }

      const hasDescription = input.description !== undefined;
      const hasSteps = input.stepsToReproduce !== undefined;
      await tx.$executeRaw`
        UPDATE bug SET
          title = COALESCE(${input.title ?? null}, title),
          severity = COALESCE(${input.severity ?? null}, severity),
          status = COALESCE(${input.status ?? null}, status),
          description = CASE WHEN ${hasDescription} THEN ${input.description ?? null} ELSE description END,
          steps_to_reproduce = CASE WHEN ${hasSteps} THEN ${input.stepsToReproduce ?? null} ELSE steps_to_reproduce END,
          updated_at = now()
        WHERE id = ${bugId}::uuid
      `;

      // Old → new per changed field, so status history is reconstructable (G4).
      const before: Record<string, unknown> = {
        title: current.title,
        severity: current.severity,
        status: current.status,
        description: current.description,
        stepsToReproduce: current.steps_to_reproduce,
      };
      const { tagIds, ...fields } = input;
      const changes: Record<string, unknown> = Object.fromEntries(
        Object.entries(fields)
          .filter(([field, value]) => before[field] !== value)
          .map(([field, value]) => [field, { from: before[field], to: value }]),
      );
      if (tagIds !== undefined) {
        const tags = await setItemTags(tx, { item: 'bug', itemId: bugId, workspaceId: actor.workspaceId, projectId, tagIds });
        if (tags.added.length > 0 || tags.removed.length > 0) {
          changes.tags = tags;
        }
      }
      await logBugActivity(tx, actor, 'bug.updated', { id: bugId, title: input.title ?? current.title }, { changes });

      return loadBug(tx, projectId, bugId);
    });
  }

  /** Links a bug with no run to a started run, taking its snapshot (ADR 0013 decision 5). */
  @Post(':bugId/link-run')
  @HttpCode(200)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async linkRun(
    @Param('projectId') projectId: string,
    @Param('bugId') bugId: string,
    @Body() body: { testRunId?: unknown },
    @Req() request: AuthenticatedRequest,
  ): Promise<BugResponse> {
    if (!isUuid(bugId)) {
      throw new NotFoundException('bug not found');
    }
    if (!isUuid(body?.testRunId)) {
      throw new BadRequestException('testRunId must be a test run id');
    }
    const testRunId = body.testRunId;
    const actor = await this.actor(request, projectId);

    return withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const run = await loadStartedRun(tx, projectId, testRunId);
      const [linked] = await tx.$queryRaw<{ id: string; title: string }[]>`
        UPDATE bug SET
          test_run_id = ${run.id}::uuid, test_case_id = ${run.testCaseId}::uuid,
          test_case_name_snapshot = ${run.testCaseName}, gherkin_snapshot = ${run.gherkinScript},
          failed_step_snapshot = NULL, updated_at = now()
        WHERE id = ${bugId}::uuid AND project_id = ${projectId}::uuid
          AND deleted_at IS NULL AND test_run_id IS NULL
        RETURNING id, title
      `;
      if (!linked) {
        await loadBug(tx, projectId, bugId); // 404 when missing
        throw new ConflictException('this bug is already linked to a run');
      }
      await logBugActivity(tx, actor, 'bug.linked', linked, { testRunId: run.id });
      return loadBug(tx, projectId, bugId);
    });
  }

  @Delete(':bugId')
  @HttpCode(204)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Admin')
  async remove(
    @Param('projectId') projectId: string,
    @Param('bugId') bugId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    if (!isUuid(bugId)) {
      throw new NotFoundException('bug not found');
    }
    const actor = await this.actor(request, projectId);

    await withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const [deleted] = await tx.$queryRaw<{ id: string; title: string }[]>`
        UPDATE bug SET deleted_at = now(), deleted_by = ${actor.userId}::uuid, updated_at = now()
        WHERE id = ${bugId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        RETURNING id, title
      `;
      if (!deleted) {
        throw new NotFoundException('bug not found');
      }
      await logBugActivity(tx, actor, 'bug.deleted', deleted);
    });
  }
}
