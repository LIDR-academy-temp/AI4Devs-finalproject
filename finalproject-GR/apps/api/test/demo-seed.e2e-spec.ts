import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject } from './helpers/cross-tenant-harness';
import { withTenantContext } from '../src/common/tenant-context';
import { provisionIdentity } from '../src/common/provision-identity';
import { decrypt } from '../src/common/secrets-encryption';
import { PrismaService } from '../src/common/prisma.service';
import { SeedConflictError, SeedTargetError, seedDemo, seedUuid } from '../src/seed/demo-seed';

jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(async (token: string) => ({ sub: token })),
  createClerkClient: jest.fn(() => ({
    users: {
      getUser: jest.fn(async (clerkUserId: string) => ({
        emailAddresses: [{ emailAddress: `${clerkUserId}@example.com` }],
        firstName: 'Seed',
        lastName: 'Owner',
      })),
    },
  })),
}));

import { AppModule } from '../src/app.module';

const DAY_MS = 86_400_000;

describe('demo seed (e2e, specs/demo-seed)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  // seedDemo takes the app's PrismaService, like the CLI.
  let service: PrismaService;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    service = new PrismaService();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await service.$disconnect();
  });

  async function signedInUser(label: string) {
    const clerkUserId = `clerk-seed-${label}-${randomUUID()}`;
    const identity = await provisionIdentity(prisma, clerkUserId, `${label}@example.com`, 'Seed Owner');
    return { clerkUserId, ...identity };
  }

  async function countRows(workspaceId: string): Promise<Record<string, number>> {
    return withTenantContext(prisma, workspaceId, async (tx) => {
      const counts: Record<string, number> = {};
      for (const table of ['folder', 'test_case', 'environment', 'environment_credential', 'test_execution', 'test_run', 'bug', 'activity_entries', 'project_membership']) {
        const [row] = await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM ${table}`);
        counts[table] = Number(row.n);
      }
      return counts;
    });
  }

  const get = (token: string, path: string) => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);

  describe('seeding a user with existing data', () => {
    let user: Awaited<ReturnType<typeof signedInUser>>;
    let existingFolderId: string;
    let existingCaseId: string;
    let otherWorkspace: { workspaceId: string; projectId: string };
    let otherBefore: Record<string, number>;
    let firstRunCounts: Record<string, number>;

    beforeAll(async () => {
      user = await signedInUser('main');
      existingFolderId = randomUUID();
      existingCaseId = randomUUID();
      await withTenantContext(prisma, user.workspaceId, async (tx) => {
        await tx.$executeRaw`INSERT INTO folder (id, project_id, workspace_id, name, position_key)
          VALUES (${existingFolderId}::uuid, ${user.projectId}::uuid, ${user.workspaceId}::uuid, 'Existing', 'i')`;
        await tx.$executeRaw`INSERT INTO test_case (id, project_id, workspace_id, name, status, position_key)
          VALUES (${existingCaseId}::uuid, ${user.projectId}::uuid, ${user.workspaceId}::uuid, 'Mine', 'Ready', 'i')`;
      });
      otherWorkspace = await createWorkspaceWithProject(prisma, `Seed-Other-${randomUUID().slice(0, 8)}`);
      otherBefore = await countRows(otherWorkspace.workspaceId);

      const result = await seedDemo(service, user.clerkUserId);
      expect(result.status).toBe('seeded');
      expect(result.counts).toMatchObject({ teammates: 2, executions: 6, environments: 2, credentials: 3 });
      expect(result.counts!.testCases).toBeGreaterThanOrEqual(25);
      firstRunCounts = await countRows(user.workspaceId);
    });

    it('lists executions in all six statuses, with counts matching their runs', async () => {
      const list = await get(user.clerkUserId, `/projects/${user.projectId}/executions`);
      expect(list.status).toBe(200);
      const seeded = (list.body as { status: string; id: string; counts: Record<string, number> }[]);
      expect(seeded.map((e) => e.status).sort()).toEqual(['Completed', 'Done', 'Draft', 'InProgress', 'Paused', 'Ready']);

      for (const summary of seeded) {
        const detail = await get(user.clerkUserId, `/projects/${user.projectId}/executions/${summary.id}`);
        const runs = detail.body.runs as { outcome: string }[];
        const n = (o: string) => runs.filter((r) => r.outcome === o).length;
        expect(summary.counts).toEqual({ total: runs.length, done: runs.length - n('Pending'), pass: n('Pass'), fail: n('Fail'), needsReview: n('NeedsReview') });
      }
    });

    it('started executions carry snapshots and timers; Done is signed off', async () => {
      const list = (await get(user.clerkUserId, `/projects/${user.projectId}/executions`)).body as { id: string; status: string }[];
      const detail = async (status: string) =>
        (await get(user.clerkUserId, `/projects/${user.projectId}/executions/${list.find((e) => e.status === status)!.id}`)).body;

      const live = await detail('InProgress');
      expect(live.lastResumedAt).not.toBeNull();
      expect(live.elapsedMsAccumulated).toBeGreaterThan(0);
      expect(live.runs.every((r: { gherkinScript: string | null }) => r.gherkinScript !== null)).toBe(true);
      const paused = await detail('Paused');
      expect(paused).toMatchObject({ lastResumedAt: null });
      expect(paused.elapsedMsAccumulated).toBeGreaterThan(0);
      const done = await detail('Done');
      expect(done.signedOffBy).toBe(user.userId);
      expect(done.signedOffAt).not.toBeNull();
      const draft = await detail('Draft');
      expect(draft).toMatchObject({ startedAt: null, elapsedMsAccumulated: 0 });
    });

    it('bugs are mostly filed from failed runs, with failed steps from the script', async () => {
      const bugs = (await get(user.clerkUserId, `/projects/${user.projectId}/bugs`)).body as {
        run: { outcome: string } | null;
        failedStep: string | null;
        gherkinSnapshot: string | null;
        autoCreated: boolean;
        severity: string;
        status: string;
      }[];
      const linked = bugs.filter((b) => b.run);
      expect(linked.length).toBeGreaterThan(bugs.length / 2);
      expect(linked.every((b) => b.run!.outcome === 'Fail')).toBe(true);
      for (const bug of linked.filter((b) => b.failedStep)) {
        expect(bug.gherkinSnapshot!.split('\n').map((l) => l.trim())).toContain(bug.failedStep);
      }
      expect(bugs.some((b) => b.autoCreated)).toBe(true);
      expect(new Set(bugs.map((b) => b.severity)).size).toBeGreaterThanOrEqual(3);
      expect(new Set(bugs.map((b) => b.status)).size).toBeGreaterThanOrEqual(4);
    });

    it('seeded credentials decrypt with the workspace key', async () => {
      const rows = await withTenantContext(prisma, user.workspaceId, (tx) =>
        tx.$queryRaw<{ id: string; password_ciphertext: string }[]>`SELECT id, password_ciphertext FROM environment_credential`,
      );
      expect(rows).toHaveLength(3);
      for (const row of rows) {
        expect(await decrypt(prisma, user.workspaceId, row.id, row.password_ciphertext)).toMatch(/^Demo-/);
      }
    });

    it('test cases show their last outcome; existing items are kept and come first', async () => {
      const cases = (await get(user.clerkUserId, `/projects/${user.projectId}/test-cases`)).body as {
        id: string;
        name: string;
        lastOutcome: string | null;
      }[];
      expect(cases.find((c) => c.id === existingCaseId)).toMatchObject({ name: 'Mine', lastOutcome: null });
      expect(cases.find((c) => c.name === 'Sign in with valid credentials')!.lastOutcome).toBe('Pass');

      const roots = await withTenantContext(prisma, user.workspaceId, (tx) =>
        tx.$queryRaw<{ id: string; name: string }[]>`
          SELECT id, name FROM folder WHERE parent_folder_id IS NULL ORDER BY position_key, id`,
      );
      expect(roots.map((f) => f.name)).toEqual(['Existing', 'ShopFlow']);
    });

    it('history spans weeks and more than one person', async () => {
      const entries = await withTenantContext(prisma, user.workspaceId, (tx) =>
        tx.$queryRaw<{ actor_user_id: string; created_at: Date }[]>`SELECT actor_user_id, created_at FROM activity_entries`,
      );
      const times = entries.map((e) => e.created_at.getTime());
      expect(Math.max(...times) - Math.min(...times)).toBeGreaterThan(14 * DAY_MS);
      expect(new Set(entries.map((e) => e.actor_user_id)).size).toBeGreaterThan(1);
    });

    it('a second run reports already-present and changes nothing', async () => {
      const again = await seedDemo(service, user.clerkUserId);

      expect(again.status).toBe('already-present');
      expect(await countRows(user.workspaceId)).toEqual(firstRunCounts);
    });

    it("another workspace's rows are untouched", async () => {
      expect(await countRows(otherWorkspace.workspaceId)).toEqual(otherBefore);
    });
  });

  it('a clashing root folder name aborts and writes nothing', async () => {
    const user = await signedInUser('clash');
    await withTenantContext(prisma, user.workspaceId, (tx) =>
      tx.$executeRaw`INSERT INTO folder (id, project_id, workspace_id, name, position_key)
        VALUES (${randomUUID()}::uuid, ${user.projectId}::uuid, ${user.workspaceId}::uuid, 'shopflow', 'i')`,
    );
    const before = await countRows(user.workspaceId);

    await expect(seedDemo(service, user.clerkUserId)).rejects.toThrow(SeedConflictError);
    expect(await countRows(user.workspaceId)).toEqual(before);
    const teammate = await prisma.$transaction(async (tx) => {
      const teammateId = seedUuid(`${user.workspaceId}:user:contributor`);
      await tx.$executeRaw`SELECT set_config('app.user_id', ${teammateId}, true)`;
      return tx.$queryRaw<{ id: string }[]>`SELECT id FROM "user" WHERE id = ${teammateId}::uuid`;
    });
    expect(teammate).toEqual([]);
  });

  it('a Clerk id that never signed in is refused', async () => {
    await expect(seedDemo(service, `clerk-never-${randomUUID()}`)).rejects.toThrow(SeedTargetError);
  });
});
