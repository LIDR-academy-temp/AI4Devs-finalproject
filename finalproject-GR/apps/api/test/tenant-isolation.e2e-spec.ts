import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject } from './helpers/cross-tenant-harness';
import { insertTestUser } from './helpers/membership-fixtures';
import { withTenantContext } from '../src/common/tenant-context';

/** One execution with one run in the fixture's project, inserted directly (no API). */
async function insertExecutionWithRun(prisma: PrismaClient, workspaceId: string, projectId: string) {
  const userId = await insertTestUser(prisma, `clerk-iso-exec-${randomUUID()}`, 'Iso Exec User');
  const executionId = randomUUID();
  const runId = randomUUID();
  await withTenantContext(prisma, workspaceId, async (tx) => {
    await tx.$executeRaw`INSERT INTO test_execution
      (id, project_id, workspace_id, name, browser, viewport_width, viewport_height, locale, timezone, created_by)
      VALUES (${executionId}::uuid, ${projectId}::uuid, ${workspaceId}::uuid, 'Iso execution', 'Chromium', 1280, 720,
              'en-US', 'UTC', ${userId}::uuid)`;
    await tx.$executeRaw`INSERT INTO test_run (id, execution_id, workspace_id, position)
      VALUES (${runId}::uuid, ${executionId}::uuid, ${workspaceId}::uuid, 1)`;
  });
  return { executionId, runId };
}

describe('tenant isolation (e2e, specs/tenant-isolation)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('cross-tenant reads return nothing', async () => {
    const a = await createWorkspaceWithProject(prisma, `Iso-A-${randomUUID().slice(0, 8)}`);
    const b = await createWorkspaceWithProject(prisma, `Iso-B-${randomUUID().slice(0, 8)}`);

    const rows = await withTenantContext(prisma, a.workspaceId, (tx) =>
      tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM project WHERE id IN (${a.projectId}::uuid, ${b.projectId}::uuid)`,
    );

    expect(rows.map((r) => r.id)).toEqual([a.projectId]);
  });

  it('missing tenant context returns zero rows', async () => {
    const a = await createWorkspaceWithProject(prisma, `Iso-C-${randomUUID().slice(0, 8)}`);

    // Deliberately bypasses withTenantContext — no workspace context is set.
    const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM project WHERE id = ${a.projectId}::uuid`;

    expect(rows).toHaveLength(0);
  });

  it('a cross-tenant write is rejected', async () => {
    const a = await createWorkspaceWithProject(prisma, `Iso-D-${randomUUID().slice(0, 8)}`);
    const b = await createWorkspaceWithProject(prisma, `Iso-E-${randomUUID().slice(0, 8)}`);

    await expect(
      withTenantContext(prisma, a.workspaceId, (tx) =>
        tx.$executeRaw`INSERT INTO project (id, workspace_id, name, slug)
          VALUES (${randomUUID()}::uuid, ${b.workspaceId}::uuid, 'Hostile insert', 'hostile-insert')`,
      ),
    ).rejects.toThrow();
  });

  it('executions and runs are isolated per workspace', async () => {
    const a = await createWorkspaceWithProject(prisma, `Iso-F-${randomUUID().slice(0, 8)}`);
    const b = await createWorkspaceWithProject(prisma, `Iso-G-${randomUUID().slice(0, 8)}`);
    const execA = await insertExecutionWithRun(prisma, a.workspaceId, a.projectId);
    const execB = await insertExecutionWithRun(prisma, b.workspaceId, b.projectId);

    const visible = await withTenantContext(prisma, a.workspaceId, async (tx) => ({
      executions: await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM test_execution WHERE id IN (${execA.executionId}::uuid, ${execB.executionId}::uuid)`,
      runs: await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM test_run WHERE id IN (${execA.runId}::uuid, ${execB.runId}::uuid)`,
    }));

    expect(visible.executions.map((r) => r.id)).toEqual([execA.executionId]);
    expect(visible.runs.map((r) => r.id)).toEqual([execA.runId]);
  });

  it('bugs are isolated per workspace and invisible without tenant context', async () => {
    const a = await createWorkspaceWithProject(prisma, `Iso-I-${randomUUID().slice(0, 8)}`);
    const b = await createWorkspaceWithProject(prisma, `Iso-J-${randomUUID().slice(0, 8)}`);
    const insertBug = async (workspaceId: string, projectId: string) => {
      const userId = await insertTestUser(prisma, `clerk-iso-bug-${randomUUID()}`, 'Iso Bug User');
      const bugId = randomUUID();
      await withTenantContext(prisma, workspaceId, (tx) =>
        tx.$executeRaw`INSERT INTO bug (id, project_id, workspace_id, title, severity, reporter_id, reporter_display_name)
          VALUES (${bugId}::uuid, ${projectId}::uuid, ${workspaceId}::uuid, 'Iso bug', 'Low', ${userId}::uuid, 'Iso Bug User')`,
      );
      return bugId;
    };
    const bugA = await insertBug(a.workspaceId, a.projectId);
    const bugB = await insertBug(b.workspaceId, b.projectId);

    const visible = await withTenantContext(prisma, a.workspaceId, (tx) =>
      tx.$queryRaw<{ id: string }[]>`SELECT id FROM bug WHERE id IN (${bugA}::uuid, ${bugB}::uuid)`,
    );
    const noContext = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM bug WHERE id = ${bugA}::uuid`;

    expect(visible.map((r) => r.id)).toEqual([bugA]);
    expect(noContext).toHaveLength(0);
  });

  it('folders are isolated per workspace and invisible without tenant context', async () => {
    const a = await createWorkspaceWithProject(prisma, `Iso-K-${randomUUID().slice(0, 8)}`);
    const b = await createWorkspaceWithProject(prisma, `Iso-L-${randomUUID().slice(0, 8)}`);
    const insertFolder = async (workspaceId: string, projectId: string) => {
      const folderId = randomUUID();
      await withTenantContext(prisma, workspaceId, (tx) =>
        tx.$executeRaw`INSERT INTO folder (id, project_id, workspace_id, name, position_key)
          VALUES (${folderId}::uuid, ${projectId}::uuid, ${workspaceId}::uuid, 'Iso folder', 'i')`,
      );
      return folderId;
    };
    const folderA = await insertFolder(a.workspaceId, a.projectId);
    const folderB = await insertFolder(b.workspaceId, b.projectId);

    const visible = await withTenantContext(prisma, a.workspaceId, (tx) =>
      tx.$queryRaw<{ id: string }[]>`SELECT id FROM folder WHERE id IN (${folderA}::uuid, ${folderB}::uuid)`,
    );
    const noContext = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM folder WHERE id = ${folderA}::uuid`;

    expect(visible.map((r) => r.id)).toEqual([folderA]);
    expect(noContext).toHaveLength(0);
  });

  it('executions and runs return zero rows without tenant context', async () => {
    const a = await createWorkspaceWithProject(prisma, `Iso-H-${randomUUID().slice(0, 8)}`);
    const exec = await insertExecutionWithRun(prisma, a.workspaceId, a.projectId);

    const executions = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM test_execution WHERE id = ${exec.executionId}::uuid`;
    const runs = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM test_run WHERE id = ${exec.runId}::uuid`;

    expect(executions).toHaveLength(0);
    expect(runs).toHaveLength(0);
  });
});
