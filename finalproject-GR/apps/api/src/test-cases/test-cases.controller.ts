import { Prisma } from '@prisma/client';
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
import { ProjectRoleGuard } from '../common/project-role.guard';
import { RequireProjectRole } from '../common/require-project-role.decorator';
import { PrismaService } from '../common/prisma.service';
import { withTenantContext } from '../common/tenant-context';
import { resolveProjectWorkspaceId } from '../common/resolve-project-workspace';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';
import { ACTIVE_STATUSES, type RunOutcome } from '../executions/execution-lifecycle';
import { isUuid } from '../executions/execution-input';
import { type ExecutionActor, loadActorDisplayName } from '../executions/execution-queries';
import { parseMoveTarget, parseParentId } from '../folders/tree-rules';
import { assertTargetFolder, keyForAppend, keyForMove, logTreeActivity } from '../folders/folder-queries';
import { parseTagIds, projectTags, setItemTags } from '../tags/tag-queries';

type TestCaseStatus = 'Draft' | 'Ready' | 'Deprecated';

interface TestCaseRow {
  id: string;
  name: string;
  gherkin_script: string | null;
  status: TestCaseStatus;
  folder_id: string | null;
  position_key: string;
  last_outcome: RunOutcome | null;
  tag_ids: string[];
}

interface TestCaseResponse {
  id: string;
  name: string;
  gherkinScript: string | null;
  status: TestCaseStatus;
  sourceType: 'Gherkin' | 'Manual';
  /** null = the root of the tree (folder-tree). */
  folderId: string | null;
  positionKey: string;
  /** Newest recorded outcome in a non-deleted execution; null if never run. */
  lastOutcome: RunOutcome | null;
  /** Tags carried (ADR 0016), sorted by id. */
  tagIds: string[];
}

interface CreateTestCaseBody {
  name?: unknown;
  gherkinScript?: unknown;
  folderId?: unknown;
  /** Tags to create the test case with. */
  tagIds?: unknown;
}

interface UpdateTestCaseBody {
  name?: unknown;
  gherkinScript?: unknown;
  status?: unknown;
  /** The full set of tags the test case should carry. */
  tagIds?: unknown;
}

const TEST_CASE_STATUSES: TestCaseStatus[] = ['Draft', 'Ready', 'Deprecated'];

function toResponse(row: TestCaseRow): TestCaseResponse {
  return {
    id: row.id,
    name: row.name,
    gherkinScript: row.gherkin_script,
    status: row.status,
    sourceType: row.gherkin_script ? 'Gherkin' : 'Manual',
    folderId: row.folder_id,
    positionKey: row.position_key,
    lastOutcome: row.last_outcome,
    tagIds: row.tag_ids,
  };
}

/** One read shape for list, detail and every write's response. */
const TEST_CASE_SELECT = Prisma.sql`
  SELECT tc.id, tc.name, tc.gherkin_script, tc.status, tc.folder_id, tc.position_key, last.outcome AS last_outcome,
    COALESCE((SELECT array_agg(tt.tag_id ORDER BY tt.tag_id) FROM test_case_tag tt WHERE tt.test_case_id = tc.id), '{}') AS tag_ids
  FROM test_case tc
  LEFT JOIN LATERAL (
    SELECT r.outcome FROM test_run r JOIN test_execution e ON e.id = r.execution_id
    WHERE r.test_case_id = tc.id AND r.outcome <> 'Pending' AND e.deleted_at IS NULL
    ORDER BY r.outcome_updated_at DESC NULLS LAST
    LIMIT 1
  ) last ON true
`;

async function loadTestCase(tx: Prisma.TransactionClient, projectId: string, testCaseId: string): Promise<TestCaseRow | null> {
  const [row] = await tx.$queryRaw<TestCaseRow[]>`
    ${TEST_CASE_SELECT}
    WHERE tc.id = ${testCaseId}::uuid AND tc.project_id = ${projectId}::uuid AND tc.deleted_at IS NULL
  `;
  return row ?? null;
}

@Controller('projects/:projectId/test-cases')
export class TestCasesController {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(request: AuthenticatedRequest, projectId: string): Promise<ExecutionActor> {
    const userId = request.auth!.userId;
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, userId, projectId);
    return { workspaceId, projectId, userId, displayName: await loadActorDisplayName(this.prisma, userId) };
  }

  @Post()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async create(
    @Param('projectId') projectId: string,
    @Body() body: CreateTestCaseBody,
    @Req() request: AuthenticatedRequest,
  ): Promise<TestCaseResponse> {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      throw new BadRequestException('name must be a non-empty string');
    }
    const gherkinScript = typeof body.gherkinScript === 'string' && body.gherkinScript.length > 0 ? body.gherkinScript : null;
    const folderId = parseParentId(body.folderId, 'folderId');
    const tagIds = parseTagIds(body.tagIds) ?? [];

    const actor = await this.actor(request, projectId);
    const workspaceId = actor.workspaceId;

    const row = await withTenantContext(this.prisma, workspaceId, async (tx) => {
      await assertTargetFolder(tx, projectId, folderId);
      const tags = await projectTags(tx, projectId, tagIds);
      // New test cases go last among their siblings (folder-tree).
      const key = await keyForAppend(tx, 'test_case', projectId, folderId);
      const [created] = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO test_case (project_id, workspace_id, name, gherkin_script, folder_id, position_key)
        VALUES (${projectId}::uuid, ${workspaceId}::uuid, ${body.name}, ${gherkinScript}, ${folderId}::uuid, ${key})
        RETURNING id
      `;
      if (tags.length > 0) {
        await setItemTags(tx, { item: 'test_case', itemId: created.id, workspaceId, projectId, tagIds });
      }
      await logTreeActivity(tx, actor, 'test_case.created', { type: 'test_case', id: created.id, name: body.name as string }, {
        folderId,
        tags: tags.map((t) => t.name),
      });
      return (await loadTestCase(tx, projectId, created.id))!;
    });

    return toResponse(row);
  }

  @Get()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async list(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest): Promise<TestCaseResponse[]> {
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);

    const rows = await withTenantContext(this.prisma, workspaceId, (tx) =>
      tx.$queryRaw<TestCaseRow[]>`
        ${TEST_CASE_SELECT}
        WHERE tc.project_id = ${projectId}::uuid AND tc.deleted_at IS NULL
        ORDER BY tc.position_key, tc.id
      `,
    );

    return rows.map(toResponse);
  }

  @Get(':testCaseId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async detail(
    @Param('projectId') projectId: string,
    @Param('testCaseId') testCaseId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<TestCaseResponse> {
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);

    const row = await withTenantContext(this.prisma, workspaceId, (tx) => loadTestCase(tx, projectId, testCaseId));

    if (!row) {
      throw new NotFoundException('test case not found');
    }

    return toResponse(row);
  }

  @Patch(':testCaseId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async update(
    @Param('projectId') projectId: string,
    @Param('testCaseId') testCaseId: string,
    @Body() body: UpdateTestCaseBody,
    @Req() request: AuthenticatedRequest,
  ): Promise<TestCaseResponse> {
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
      throw new BadRequestException('name must be a non-empty string');
    }
    if (body.gherkinScript !== undefined && body.gherkinScript !== null && typeof body.gherkinScript !== 'string') {
      throw new BadRequestException('gherkinScript must be a string or null');
    }
    if (body.status !== undefined && !TEST_CASE_STATUSES.includes(body.status as TestCaseStatus)) {
      throw new BadRequestException(`status must be one of ${TEST_CASE_STATUSES.join(', ')}`);
    }
    if (!isUuid(testCaseId)) {
      throw new NotFoundException('test case not found');
    }
    const tagIds = parseTagIds(body.tagIds);

    const name = typeof body.name === 'string' ? body.name : null;
    const hasGherkinScriptUpdate = body.gherkinScript !== undefined;
    const gherkinScript = hasGherkinScriptUpdate ? (body.gherkinScript as string | null) : null;
    const status = typeof body.status === 'string' ? (body.status as TestCaseStatus) : null;

    const actor = await this.actor(request, projectId);

    const row = await withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const [current] = await tx.$queryRaw<{ name: string; gherkin_script: string | null; status: TestCaseStatus }[]>`
        SELECT name, gherkin_script, status FROM test_case
        WHERE id = ${testCaseId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (!current) {
        return null;
      }

      const changes: Record<string, unknown> = {};
      if (name !== null && name !== current.name) changes.name = { from: current.name, to: name };
      if (hasGherkinScriptUpdate && gherkinScript !== current.gherkin_script) changes.gherkinScript = true;
      if (status !== null && status !== current.status) changes.status = { from: current.status, to: status };

      if (tagIds !== undefined) {
        const tags = await setItemTags(tx, { item: 'test_case', itemId: testCaseId, workspaceId: actor.workspaceId, projectId, tagIds });
        if (tags.added.length > 0 || tags.removed.length > 0) {
          changes.tags = tags;
        }
      }

      await tx.$executeRaw`
        UPDATE test_case
        SET
          name = COALESCE(${name}, name),
          gherkin_script = CASE WHEN ${hasGherkinScriptUpdate} THEN ${gherkinScript} ELSE gherkin_script END,
          status = COALESCE(${status}, status)
        WHERE id = ${testCaseId}::uuid
      `;
      // ADR 0015: every change (status included) is logged; an update that changes nothing isn't.
      if (Object.keys(changes).length > 0) {
        await logTreeActivity(tx, actor, 'test_case.updated', { type: 'test_case', id: testCaseId, name: name ?? current.name }, {
          changes,
        });
      }
      return loadTestCase(tx, projectId, testCaseId);
    });

    if (!row) {
      throw new NotFoundException('test case not found');
    }

    return toResponse(row);
  }

  /** Moves a test case to a folder (or the root) after a sibling test case, or first (folder-tree). */
  @Post(':testCaseId/move')
  @HttpCode(200)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async move(
    @Param('projectId') projectId: string,
    @Param('testCaseId') testCaseId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<TestCaseResponse> {
    if (!isUuid(testCaseId)) {
      throw new NotFoundException('test case not found');
    }
    const target = parseMoveTarget(body ?? {}, 'folderId');
    const actor = await this.actor(request, projectId);

    const row = await withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const [current] = await tx.$queryRaw<{ name: string; folder_id: string | null }[]>`
        SELECT name, folder_id FROM test_case
        WHERE id = ${testCaseId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (!current) {
        throw new NotFoundException('test case not found');
      }
      await assertTargetFolder(tx, projectId, target.parentFolderId);
      const key = await keyForMove(tx, 'test_case', projectId, target.parentFolderId, target.afterId, testCaseId);
      await tx.$executeRaw`
        UPDATE test_case SET folder_id = ${target.parentFolderId}::uuid, position_key = ${key}
        WHERE id = ${testCaseId}::uuid
      `;
      await logTreeActivity(tx, actor, 'test_case.moved', { type: 'test_case', id: testCaseId, name: current.name }, {
        fromFolderId: current.folder_id,
        toFolderId: target.parentFolderId,
      });
      return (await loadTestCase(tx, projectId, testCaseId))!;
    });

    return toResponse(row);
  }

  @Delete(':testCaseId')
  @HttpCode(204)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Admin')
  async remove(
    @Param('projectId') projectId: string,
    @Param('testCaseId') testCaseId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const actor = await this.actor(request, projectId);

    const rows = await withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      // PRD §6.2.5 / ADR 0012: refused while part of a Ready, InProgress or Paused execution.
      const active = await tx.$queryRaw<{ name: string }[]>`
        SELECT e.name FROM test_run r
        JOIN test_execution e ON e.id = r.execution_id
        WHERE r.test_case_id = ${testCaseId}::uuid AND e.deleted_at IS NULL
          AND e.status = ANY(${ACTIVE_STATUSES}::text[])
        LIMIT 1
      `;
      if (active.length > 0) {
        throw new ConflictException(`test case is part of the active execution "${active[0].name}"`);
      }

      const deleted = await tx.$queryRaw<{ id: string; name: string }[]>`
        UPDATE test_case
        SET deleted_at = now(), deleted_by = ${actor.userId}::uuid
        WHERE id = ${testCaseId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        RETURNING id, name
      `;
      if (deleted.length > 0) {
        await logTreeActivity(tx, actor, 'test_case.deleted', { type: 'test_case', id: testCaseId, name: deleted[0].name });
      }
      return deleted;
    });

    if (rows.length === 0) {
      throw new NotFoundException('test case not found');
    }
  }
}
