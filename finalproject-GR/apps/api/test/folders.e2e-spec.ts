import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject, type WorkspaceFixture } from './helpers/cross-tenant-harness';
import { activityCodesFor, setUpProjectMember } from './helpers/execution-fixtures';
import { withTenantContext } from '../src/common/tenant-context';

jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(async (token: string) => ({ sub: token })),
  createClerkClient: jest.fn(() => ({
    users: {
      getUser: jest.fn(async (clerkUserId: string) => ({
        emailAddresses: [{ emailAddress: `${clerkUserId}@example.com` }],
        firstName: 'Test',
        lastName: 'User',
      })),
    },
  })),
}));

import { AppModule } from '../src/app.module';

interface Setup extends WorkspaceFixture {
  contributor: string;
  admin: string;
  viewer: string;
}

describe('folders (e2e, specs/test-case-folders)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const api = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function setUp(label: string): Promise<Setup> {
    const f = await createWorkspaceWithProject(prisma, `${label}-${randomUUID().slice(0, 8)}`);
    return {
      ...f,
      contributor: await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Contributor'),
      admin: await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Admin'),
      viewer: await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Viewer'),
    };
  }

  const folders = (s: Setup) => `/projects/${s.projectId}/folders`;
  const testCases = (s: Setup) => `/projects/${s.projectId}/test-cases`;

  async function folder(s: Setup, name: string, parentFolderId: string | null = null): Promise<string> {
    const response = await api().post(folders(s)).set(as(s.contributor)).send({ name, parentFolderId });
    expect(response.status).toBe(201);
    return response.body.id;
  }

  async function testCase(s: Setup, name: string, folderId: string | null = null): Promise<string> {
    const response = await api().post(testCases(s)).set(as(s.contributor)).send({ name, folderId });
    expect(response.status).toBe(201);
    return response.body.id;
  }

  /** Ids in tree order for one parent, as the API orders them. */
  async function folderIdsIn(s: Setup, parentFolderId: string | null): Promise<string[]> {
    const list = await api().get(folders(s)).set(as(s.viewer));
    return list.body.filter((f: { parentFolderId: string | null }) => f.parentFolderId === parentFolderId).map((f: { id: string }) => f.id);
  }

  async function testCaseIdsIn(s: Setup, folderId: string | null): Promise<string[]> {
    const list = await api().get(testCases(s)).set(as(s.viewer));
    return list.body.filter((t: { folderId: string | null }) => t.folderId === folderId).map((t: { id: string }) => t.id);
  }

  /** A four-level chain L1 > L2 > L3 > L4; returns their ids. */
  async function chain(s: Setup, levels: number): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 1; i <= levels; i++) {
      ids.push(await folder(s, `L${i}`, ids[ids.length - 1] ?? null));
    }
    return ids;
  }

  describe('create and rename', () => {
    it('creates a nested folder, appended after existing siblings', async () => {
      const s = await setUp('Fld-Create');
      const checkout = await folder(s, 'Checkout');
      const first = await folder(s, 'Cards', checkout);
      const payments = await folder(s, 'Payments', checkout);

      expect(await folderIdsIn(s, checkout)).toEqual([first, payments]);
      expect(await activityCodesFor(prisma, s.workspaceId, payments)).toEqual(['folder.created']);
    });

    it('rejects duplicate sibling names ignoring case, on create and rename (409)', async () => {
      const s = await setUp('Fld-Dupe');
      await folder(s, 'Payments');
      const other = await folder(s, 'Refunds');

      expect((await api().post(folders(s)).set(as(s.contributor)).send({ name: 'payments' })).status).toBe(409);
      expect((await api().patch(`${folders(s)}/${other}`).set(as(s.contributor)).send({ name: 'PAYMENTS' })).status).toBe(409);
      // The same name in a different parent is fine.
      expect((await api().post(folders(s)).set(as(s.contributor)).send({ name: 'Payments', parentFolderId: other })).status).toBe(201);
    });

    it('a Viewer cannot create folders (403)', async () => {
      const s = await setUp('Fld-Viewer');
      expect((await api().post(folders(s)).set(as(s.viewer)).send({ name: 'X' })).status).toBe(403);
    });
  });

  describe('depth and cycles', () => {
    it('refuses a fifth level (409)', async () => {
      const s = await setUp('Fld-Fifth');
      const [, , , l4] = await chain(s, 4);

      expect((await api().post(folders(s)).set(as(s.contributor)).send({ name: 'L5', parentFolderId: l4 })).status).toBe(409);
    });

    it('refuses moving a subtree where it would exceed four levels (409), and nothing moves', async () => {
      const s = await setUp('Fld-DeepMove');
      const [, , l3] = await chain(s, 3);
      const top = await folder(s, 'Top');
      const mid = await folder(s, 'Mid', top);
      await folder(s, 'Leaf', mid);

      const response = await api().post(`${folders(s)}/${top}/move`).set(as(s.contributor)).send({ parentFolderId: l3, afterId: null });

      expect(response.status).toBe(409);
      expect(await folderIdsIn(s, null)).toContain(top);
    });

    it('refuses moving a folder into its own descendant (409)', async () => {
      const s = await setUp('Fld-Cycle');
      const checkout = await folder(s, 'Checkout');
      const payments = await folder(s, 'Payments', checkout);

      const response = await api().post(`${folders(s)}/${checkout}/move`).set(as(s.contributor)).send({ parentFolderId: payments });

      expect(response.status).toBe(409);
    });
  });

  describe('moving and ordering', () => {
    it('reorders test cases: A, B, C → move C after A → A, C, B', async () => {
      const s = await setUp('Fld-Reorder');
      const f = await folder(s, 'F');
      const a = await testCase(s, 'A', f);
      const b = await testCase(s, 'B', f);
      const c = await testCase(s, 'C', f);
      expect(await testCaseIdsIn(s, f)).toEqual([a, b, c]);

      const moved = await api().post(`${testCases(s)}/${c}/move`).set(as(s.contributor)).send({ folderId: f, afterId: a });

      expect(moved.status).toBe(200);
      expect(await testCaseIdsIn(s, f)).toEqual([a, c, b]);
      expect(await activityCodesFor(prisma, s.workspaceId, c)).toContain('test_case.moved');
    });

    it('moves a test case out of its folder to the root, first', async () => {
      const s = await setUp('Fld-ToRoot');
      const rootCase = await testCase(s, 'Root case');
      const f = await folder(s, 'F');
      const inner = await testCase(s, 'Inner', f);

      await api().post(`${testCases(s)}/${inner}/move`).set(as(s.contributor)).send({ folderId: null, afterId: null });

      expect(await testCaseIdsIn(s, null)).toEqual([inner, rootCase]);
      expect(await testCaseIdsIn(s, f)).toEqual([]);
    });

    it('reorders and reparents folders', async () => {
      const s = await setUp('Fld-MoveFolder');
      const a = await folder(s, 'A');
      const b = await folder(s, 'B');
      const c = await folder(s, 'C');

      await api().post(`${folders(s)}/${c}/move`).set(as(s.contributor)).send({ parentFolderId: null, afterId: null });
      expect(await folderIdsIn(s, null)).toEqual([c, a, b]);

      await api().post(`${folders(s)}/${b}/move`).set(as(s.contributor)).send({ parentFolderId: a, afterId: null });
      expect(await folderIdsIn(s, a)).toEqual([b]);
      expect(await activityCodesFor(prisma, s.workspaceId, b)).toContain('folder.moved');
    });

    it('rejects a foreign target folder or an afterId that is not a sibling (400), and nothing moves', async () => {
      const s = await setUp('Fld-BadTarget');
      const other = await setUp('Fld-BadTarget-Other');
      const foreign = await folder(other, 'Foreign');
      const f = await folder(s, 'F');
      const g = await folder(s, 'G');
      const inG = await testCase(s, 'In G', g);
      const t = await testCase(s, 'T', f);

      expect((await api().post(`${testCases(s)}/${t}/move`).set(as(s.contributor)).send({ folderId: foreign })).status).toBe(400);
      expect((await api().post(`${testCases(s)}/${t}/move`).set(as(s.contributor)).send({ folderId: f, afterId: inG })).status).toBe(400);
      expect(await testCaseIdsIn(s, f)).toEqual([t]);
    });
  });

  describe('test cases in folders (specs/test-case-authoring)', () => {
    it('creates a test case in a folder, after the existing ones', async () => {
      const s = await setUp('Fld-TcCreate');
      const f = await folder(s, 'Checkout');
      const first = await testCase(s, 'First', f);
      const second = await testCase(s, 'Second', f);
      const third = await testCase(s, 'Third', f);

      expect(await testCaseIdsIn(s, f)).toEqual([first, second, third]);
    });

    it('rejects a foreign or deleted folder (400)', async () => {
      const s = await setUp('Fld-TcForeign');
      const other = await setUp('Fld-TcForeign-Other');
      const foreign = await folder(other, 'Foreign');
      const doomed = await folder(s, 'Doomed');
      await api().delete(`${folders(s)}/${doomed}`).set(as(s.admin));

      for (const folderId of [foreign, doomed, randomUUID()]) {
        expect((await api().post(testCases(s)).set(as(s.contributor)).send({ name: 'X', folderId })).status).toBe(400);
      }
    });

    it('reports the last recorded outcome, or none if never run', async () => {
      const s = await setUp('Fld-LastOutcome');
      const ran = await testCase(s, 'Ran');
      const never = await testCase(s, 'Never');
      await api().patch(`${testCases(s)}/${ran}`).set(as(s.contributor)).send({ status: 'Ready' });
      const execution = await api().post(`/projects/${s.projectId}/executions`).set(as(s.contributor)).send({ name: 'E', testCaseIds: [ran] });
      const base = `/projects/${s.projectId}/executions/${execution.body.id}`;
      await api().post(`${base}/mark-ready`).set(as(s.contributor));
      await api().post(`${base}/run-all`).set(as(s.contributor)).send({ mode: 'Manual' });
      await api().patch(`${base}/runs/${execution.body.runs[0].id}`).set(as(s.contributor)).send({ outcome: 'Fail' });

      const list = await api().get(testCases(s)).set(as(s.viewer));
      const byId = Object.fromEntries(list.body.map((t: { id: string; lastOutcome: string | null }) => [t.id, t.lastOutcome]));

      expect(byId[ran]).toBe('Fail');
      expect(byId[never]).toBeNull();
      expect(list.body.every((t: { positionKey: string }) => typeof t.positionKey === 'string')).toBe(true);
    });
  });

  describe('deleting', () => {
    it('reports the impact, then deletes the whole subtree', async () => {
      const s = await setUp('Fld-Delete');
      const checkout = await folder(s, 'Checkout');
      const payments = await folder(s, 'Payments', checkout);
      await testCase(s, 'Direct', checkout);
      await testCase(s, 'Nested 1', payments);
      await testCase(s, 'Nested 2', payments);

      const impact = await api().get(`${folders(s)}/${checkout}/delete-impact`).set(as(s.viewer));
      expect(impact.body).toEqual({ folders: 2, testCases: 3 });

      expect((await api().delete(`${folders(s)}/${checkout}`).set(as(s.admin))).status).toBe(204);
      expect((await api().get(folders(s)).set(as(s.viewer))).body).toEqual([]);
      expect((await api().get(testCases(s)).set(as(s.viewer))).body).toEqual([]);

      const [log] = await withTenantContext(prisma, s.workspaceId, (tx) =>
        tx.$queryRaw<{ details: { folders: number; testCases: number } }[]>`
          SELECT details FROM activity_entries WHERE entity_id = ${checkout}::uuid AND action_code = 'folder.deleted'`,
      );
      expect(log.details).toMatchObject({ folders: 2, testCases: 3 });
    });

    it('is blocked by an In Progress execution (409 naming it), but not by a Draft one', async () => {
      const s = await setUp('Fld-DeleteActive');
      const busy = await folder(s, 'Busy');
      const busyCase = await testCase(s, 'Busy case', busy);
      const idle = await folder(s, 'Idle');
      const idleCase = await testCase(s, 'Idle case', idle);
      for (const id of [busyCase, idleCase]) {
        await api().patch(`${testCases(s)}/${id}`).set(as(s.contributor)).send({ status: 'Ready' });
      }
      const running = await api().post(`/projects/${s.projectId}/executions`).set(as(s.contributor)).send({ name: 'Nightly run', testCaseIds: [busyCase] });
      const base = `/projects/${s.projectId}/executions/${running.body.id}`;
      await api().post(`${base}/mark-ready`).set(as(s.contributor));
      await api().post(`${base}/run-all`).set(as(s.contributor)).send({ mode: 'Manual' });
      await api().post(`/projects/${s.projectId}/executions`).set(as(s.contributor)).send({ name: 'Draft plan', testCaseIds: [idleCase] });

      const blocked = await api().delete(`${folders(s)}/${busy}`).set(as(s.admin));
      const allowed = await api().delete(`${folders(s)}/${idle}`).set(as(s.admin));

      expect(blocked.status).toBe(409);
      expect(blocked.body.executions).toEqual(['Nightly run']);
      expect(await folderIdsIn(s, null)).toEqual([busy]);
      expect(allowed.status).toBe(204);
    });

    it('a Contributor cannot delete folders (403)', async () => {
      const s = await setUp('Fld-DeleteContrib');
      const f = await folder(s, 'F');
      expect((await api().delete(`${folders(s)}/${f}`).set(as(s.contributor))).status).toBe(403);
    });
  });

  describe('tenancy', () => {
    it("another workspace's folder is not found directly (404)", async () => {
      const s = await setUp('Fld-TenantA');
      const other = await setUp('Fld-TenantB');
      const foreign = await folder(other, 'Foreign');

      expect((await api().patch(`${folders(s)}/${foreign}`).set(as(s.contributor)).send({ name: 'Mine' })).status).toBe(404);
      expect((await api().get(`${folders(s)}/${foreign}/delete-impact`).set(as(s.viewer))).status).toBe(404);
    });
  });
});
