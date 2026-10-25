import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject, type WorkspaceFixture } from './helpers/cross-tenant-harness';
import { activityCodesFor, insertTestCases, setUpProjectMember } from './helpers/execution-fixtures';
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
  testCaseIds: string[];
  executionId: string;
  runIds: string[];
}

describe('bugs (e2e, specs/bug-tracking)', () => {
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

  /**
   * A project with one member per role and an execution over two test cases (scripts
   * "Given Case 1" / "Given Case 2"), started unless `started` is false.
   */
  async function setUp(label: string, options: { started?: boolean; autoCreateBug?: boolean } = {}): Promise<Setup> {
    const f = await createWorkspaceWithProject(prisma, `${label}-${randomUUID().slice(0, 8)}`);
    const contributor = await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Contributor');
    const admin = await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Admin');
    const viewer = await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Viewer');
    const testCaseIds = await insertTestCases(prisma, f.workspaceId, f.projectId, ['Case 1', 'Case 2']);
    const execution = await api()
      .post(`/projects/${f.projectId}/executions`)
      .set(as(contributor))
      .send({ name: label, testCaseIds, autoCreateBug: options.autoCreateBug ?? false });
    const base = `/projects/${f.projectId}/executions/${execution.body.id}`;
    if (options.started !== false) {
      await api().post(`${base}/mark-ready`).set(as(contributor));
      await api().post(`${base}/run-all`).set(as(contributor)).send({ mode: 'Manual' });
    }
    return {
      ...f,
      contributor,
      admin,
      viewer,
      testCaseIds,
      executionId: execution.body.id,
      runIds: execution.body.runs.map((r: { id: string }) => r.id),
    };
  }

  const bugs = (s: Setup) => `/projects/${s.projectId}/bugs`;
  const file = (s: Setup, token: string, body: Record<string, unknown>) => api().post(bugs(s)).set(as(token)).send(body);
  const setOutcome = (s: Setup, runId: string, outcome: string) =>
    api()
      .patch(`/projects/${s.projectId}/executions/${s.executionId}/runs/${runId}`)
      .set(as(s.contributor))
      .send({ outcome });

  describe('filing', () => {
    it('a Contributor files a manual bug: Open, with the reporter name', async () => {
      const s = await setUp('Bug-Manual', { started: false });

      const response = await file(s, s.contributor, { title: 'Checkout total is wrong', severity: 'High' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Checkout total is wrong',
        severity: 'High',
        status: 'Open',
        reporterName: 'Contributor User',
        autoCreated: false,
        run: null,
        testCase: null,
        gherkinSnapshot: null,
      });
      expect(await activityCodesFor(prisma, s.workspaceId, response.body.id)).toEqual(['bug.created']);
    });

    it('rejects a blank title or unknown severity (400), and a Viewer (403)', async () => {
      const s = await setUp('Bug-Invalid', { started: false });

      expect((await file(s, s.contributor, { title: ' ', severity: 'High' })).status).toBe(400);
      expect((await file(s, s.contributor, { title: 'X', severity: 'Urgent' })).status).toBe(400);
      expect((await file(s, s.viewer, { title: 'X', severity: 'High' })).status).toBe(403);
    });

    it('filing from a run copies its start snapshot; later test case edits do not change it', async () => {
      const s = await setUp('Bug-FromRun');

      const created = await file(s, s.contributor, { title: 'Case 1 fails', severity: 'Medium', testRunId: s.runIds[0] });
      await api()
        .patch(`/projects/${s.projectId}/test-cases/${s.testCaseIds[0]}`)
        .set(as(s.contributor))
        .send({ name: 'Renamed later', gherkinScript: 'Given something else' });
      const detail = await api().get(`${bugs(s)}/${created.body.id}`).set(as(s.viewer));

      expect(created.status).toBe(201);
      expect(detail.body).toMatchObject({
        testCaseNameSnapshot: 'Case 1',
        gherkinSnapshot: 'Given Case 1',
        run: { id: s.runIds[0], executionId: s.executionId, position: 1, outcome: 'Pending', deleted: false },
        testCase: { id: s.testCaseIds[0], deleted: false },
      });
    });

    it('rejects a run of an unstarted execution (400)', async () => {
      const s = await setUp('Bug-Unstarted', { started: false });

      const response = await file(s, s.contributor, { title: 'X', severity: 'Low', testRunId: s.runIds[0] });

      expect(response.status).toBe(400);
    });

    it('stores a failed step that is a script line, and rejects one that is not', async () => {
      const s = await setUp('Bug-Step');

      const ok = await file(s, s.contributor, {
        title: 'X',
        severity: 'Low',
        testRunId: s.runIds[0],
        failedStep: '  Given Case 1 ',
      });
      const bad = await file(s, s.contributor, {
        title: 'X',
        severity: 'Low',
        testRunId: s.runIds[0],
        failedStep: 'Then something else',
      });

      expect(ok.body.failedStep).toBe('Given Case 1');
      expect(bad.status).toBe(400);
    });
  });

  describe('reading', () => {
    it('?testRunId= returns only that run’s bugs', async () => {
      const s = await setUp('Bug-ByRun');
      const onRun1 = await file(s, s.contributor, { title: 'On run 1', severity: 'Low', testRunId: s.runIds[0] });
      await file(s, s.contributor, { title: 'On run 2', severity: 'Low', testRunId: s.runIds[1] });
      await file(s, s.contributor, { title: 'Manual', severity: 'Low' });

      const list = await api().get(`${bugs(s)}?testRunId=${s.runIds[0]}`).set(as(s.viewer));

      expect(list.body.map((b: { id: string }) => b.id)).toEqual([onRun1.body.id]);
    });

    it("another workspace's bug is not found through the caller's own project route (404)", async () => {
      const a = await setUp('Bug-TenantA', { started: false });
      const b = await setUp('Bug-TenantB', { started: false });
      const bugB = await file(b, b.contributor, { title: 'B only', severity: 'Low' });

      const response = await api().get(`${bugs(a)}/${bugB.body.id}`).set(as(a.viewer));

      expect(response.status).toBe(404);
    });
  });

  describe('editing', () => {
    it('moves through the lifecycle and can reopen, logging each change', async () => {
      const s = await setUp('Bug-Status', { started: false });
      const bug = await file(s, s.contributor, { title: 'X', severity: 'Low' });
      const url = `${bugs(s)}/${bug.body.id}`;

      for (const status of ['InProgress', 'Resolved', 'Closed', 'Open']) {
        const response = await api().patch(url).set(as(s.contributor)).send({ status });
        expect({ status: response.status, body: response.body.status }).toEqual({ status: 200, body: status });
      }

      const entries = await withTenantContext(prisma, s.workspaceId, (tx) =>
        tx.$queryRaw<{ details: { changes: Record<string, { from: unknown; to: unknown }> } }[]>`
          SELECT details FROM activity_entries WHERE entity_id = ${bug.body.id}::uuid AND action_code = 'bug.updated'`,
      );
      expect(entries).toHaveLength(4);
      expect(entries.map((e) => e.details.changes.status)).toContainEqual({ from: 'Closed', to: 'Open' });
    });

    it('rejects an unknown status (400) and a Viewer (403), leaving the bug unchanged', async () => {
      const s = await setUp('Bug-EditInvalid', { started: false });
      const bug = await file(s, s.contributor, { title: 'X', severity: 'Low' });
      const url = `${bugs(s)}/${bug.body.id}`;

      expect((await api().patch(url).set(as(s.contributor)).send({ status: 'Done' })).status).toBe(400);
      expect((await api().patch(url).set(as(s.viewer)).send({ status: 'Closed' })).status).toBe(403);
      expect((await api().get(url).set(as(s.viewer))).body.status).toBe('Open');
    });
  });

  describe('linking', () => {
    it('links an unlinked bug to a run, taking its snapshot; relinking is refused (409)', async () => {
      const s = await setUp('Bug-Link');
      const bug = await file(s, s.contributor, { title: 'Manual first', severity: 'High' });
      const url = `${bugs(s)}/${bug.body.id}/link-run`;

      const linked = await api().post(url).set(as(s.contributor)).send({ testRunId: s.runIds[1] });
      const relink = await api().post(url).set(as(s.contributor)).send({ testRunId: s.runIds[0] });
      const detail = await api().get(`${bugs(s)}/${bug.body.id}`).set(as(s.viewer));

      expect(linked.status).toBe(200);
      expect(linked.body).toMatchObject({ gherkinSnapshot: 'Given Case 2', run: { id: s.runIds[1] } });
      expect(relink.status).toBe(409);
      expect(detail.body.run.id).toBe(s.runIds[1]);
      expect(await activityCodesFor(prisma, s.workspaceId, bug.body.id)).toContain('bug.linked');
    });
  });

  describe('deleting', () => {
    it('an Admin soft-deletes a bug; a Contributor cannot', async () => {
      const s = await setUp('Bug-Delete', { started: false });
      const bug = await file(s, s.contributor, { title: 'X', severity: 'Low' });
      const url = `${bugs(s)}/${bug.body.id}`;

      expect((await api().delete(url).set(as(s.contributor))).status).toBe(403);
      expect((await api().delete(url).set(as(s.admin))).status).toBe(204);
      expect((await api().get(url).set(as(s.admin))).status).toBe(404);
      expect((await api().get(bugs(s)).set(as(s.admin))).body).toEqual([]);
      expect(await activityCodesFor(prisma, s.workspaceId, bug.body.id)).toContain('bug.deleted');
    });
  });

  describe('auto-create on failure (G8)', () => {
    it('setting Fail creates one Open, Medium bug titled with the test case, reported by the tester', async () => {
      const s = await setUp('Bug-Auto', { autoCreateBug: true });

      expect((await setOutcome(s, s.runIds[0], 'Fail')).status).toBe(200);
      const list = await api().get(`${bugs(s)}?testRunId=${s.runIds[0]}`).set(as(s.viewer));

      expect(list.body).toHaveLength(1);
      expect(list.body[0]).toMatchObject({
        title: 'Case 1',
        status: 'Open',
        severity: 'Medium',
        autoCreated: true,
        reporterName: 'Contributor User',
        gherkinSnapshot: 'Given Case 1',
      });
    });

    it('creates nothing when the execution has auto-create off', async () => {
      const s = await setUp('Bug-AutoOff');

      await setOutcome(s, s.runIds[0], 'Fail');

      expect((await api().get(bugs(s)).set(as(s.viewer))).body).toEqual([]);
    });

    it('creates at most one per run, even across Fail → Pass → Fail and concurrent Fails', async () => {
      const s = await setUp('Bug-AutoOnce', { autoCreateBug: true });

      await setOutcome(s, s.runIds[0], 'Fail');
      await setOutcome(s, s.runIds[0], 'Pass');
      await setOutcome(s, s.runIds[0], 'Fail');
      await Promise.all([setOutcome(s, s.runIds[1], 'Fail'), setOutcome(s, s.runIds[1], 'Fail')]);

      const run1 = await api().get(`${bugs(s)}?testRunId=${s.runIds[0]}`).set(as(s.viewer));
      const run2 = await api().get(`${bugs(s)}?testRunId=${s.runIds[1]}`).set(as(s.viewer));
      expect(run1.body).toHaveLength(1);
      expect(run2.body).toHaveLength(1);
    });
  });
});
