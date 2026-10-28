import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject, type WorkspaceFixture } from './helpers/cross-tenant-harness';
import { activityCodesFor, insertTestCases, setUpProjectMember, sleep } from './helpers/execution-fixtures';
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
  base: string;
}

describe('executions: lifecycle (e2e, specs/test-execution-lifecycle)', () => {
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

  /** A project with one member per role and a Draft execution over `runCount` Ready test cases. */
  async function setUp(label: string, runCount = 2): Promise<Setup> {
    const f = await createWorkspaceWithProject(prisma, `${label}-${randomUUID().slice(0, 8)}`);
    const contributor = await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Contributor');
    const admin = await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Admin');
    const viewer = await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Viewer');
    const names = Array.from({ length: runCount }, (_, i) => `Case ${i + 1}`);
    const testCaseIds = await insertTestCases(prisma, f.workspaceId, f.projectId, names);
    const created = await api()
      .post(`/projects/${f.projectId}/executions`)
      .set(as(contributor))
      .send({ name: label, testCaseIds });
    const executionId = created.body.id as string;
    return { ...f, contributor, admin, viewer, testCaseIds, executionId, base: `/projects/${f.projectId}/executions/${executionId}` };
  }

  async function start(s: Setup) {
    await api().post(`${s.base}/mark-ready`).set(as(s.contributor));
    return api().post(`${s.base}/run-all`).set(as(s.contributor)).send({ mode: 'Manual' });
  }

  const runIds = async (s: Setup): Promise<string[]> =>
    (await api().get(s.base).set(as(s.viewer))).body.runs.map((r: { id: string }) => r.id);

  const setOutcome = (s: Setup, runId: string, outcome: string, token = s.contributor) =>
    api().patch(`${s.base}/runs/${runId}`).set(as(token)).send({ outcome });

  describe('Mark as Ready and Back to Draft', () => {
    it('moves Draft → Ready → Draft', async () => {
      const s = await setUp('Life-Ready');

      const ready = await api().post(`${s.base}/mark-ready`).set(as(s.contributor));
      const draft = await api().post(`${s.base}/back-to-draft`).set(as(s.contributor));

      expect(ready.status).toBe(200);
      expect(ready.body.status).toBe('Ready');
      expect(draft.body.status).toBe('Draft');
      expect(await activityCodesFor(prisma, s.workspaceId, s.executionId)).toEqual(
        expect.arrayContaining(['test_execution.marked_ready', 'test_execution.returned_to_draft']),
      );
    });

    it('refuses an invalid transition (Pause on Ready) with 409', async () => {
      const s = await setUp('Life-Invalid');
      await api().post(`${s.base}/mark-ready`).set(as(s.contributor));

      const response = await api().post(`${s.base}/pause`).set(as(s.contributor));
      const detail = await api().get(s.base).set(as(s.viewer));

      expect(response.status).toBe(409);
      expect(detail.body.status).toBe('Ready');
    });

    it('refuses Mark as Ready when a test case was deleted while Draft (409)', async () => {
      const s = await setUp('Life-ReadyDeleted');
      await api().delete(`/projects/${s.projectId}/test-cases/${s.testCaseIds[0]}`).set(as(s.admin));

      const response = await api().post(`${s.base}/mark-ready`).set(as(s.contributor));
      const detail = await api().get(s.base).set(as(s.viewer));

      expect(response.status).toBe(409);
      expect(detail.body.status).toBe('Draft');
      expect(detail.body.runs[0].testCaseDeleted).toBe(true);
    });

    it('refuses Mark as Ready when a test case was Deprecated while Draft (409)', async () => {
      const s = await setUp('Life-ReadyDeprecated');
      await api()
        .patch(`/projects/${s.projectId}/test-cases/${s.testCaseIds[1]}`)
        .set(as(s.contributor))
        .send({ status: 'Deprecated' });

      const response = await api().post(`${s.base}/mark-ready`).set(as(s.contributor));
      const detail = await api().get(s.base).set(as(s.viewer));

      expect(response.status).toBe(409);
      expect(detail.body.status).toBe('Draft');
    });
  });

  describe('Run All', () => {
    it('starts the execution and its timer', async () => {
      const s = await setUp('Life-Start');

      const response = await start(s);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: 'InProgress', elapsedMsAccumulated: 0 });
      expect(response.body.lastResumedAt).not.toBeNull();
      expect(response.body.startedAt).not.toBeNull();
      expect(await activityCodesFor(prisma, s.workspaceId, s.executionId)).toContain('test_execution.started');
    });

    it('snapshots each test case so later edits and deletes do not change the run', async () => {
      const s = await setUp('Life-Snapshot', 1);
      await start(s);

      await api()
        .patch(`/projects/${s.projectId}/test-cases/${s.testCaseIds[0]}`)
        .set(as(s.contributor))
        .send({ name: 'Renamed later', gherkinScript: 'Given something else' });
      const afterEdit = await api().get(s.base).set(as(s.viewer));
      // A run in an InProgress execution blocks the API delete, so soft-delete directly.
      await withTenantContext(prisma, s.workspaceId, (tx) =>
        tx.$executeRaw`UPDATE test_case SET deleted_at = now() WHERE id = ${s.testCaseIds[0]}::uuid`,
      );
      const afterDelete = await api().get(s.base).set(as(s.viewer));

      for (const detail of [afterEdit, afterDelete]) {
        expect(detail.body.runs[0]).toMatchObject({ testCaseName: 'Case 1', gherkinScript: 'Given Case 1' });
      }
    });

    it('rejects Automated mode with 422', async () => {
      const s = await setUp('Life-Automated');
      await api().post(`${s.base}/mark-ready`).set(as(s.contributor));

      const response = await api().post(`${s.base}/run-all`).set(as(s.contributor)).send({ mode: 'Automated' });
      const detail = await api().get(s.base).set(as(s.viewer));

      expect(response.status).toBe(422);
      expect(detail.body.status).toBe('Ready');
    });

    it('refuses to start an execution with no runs (409)', async () => {
      const s = await setUp('Life-Empty', 1);
      await api().post(`${s.base}/mark-ready`).set(as(s.contributor));
      await withTenantContext(prisma, s.workspaceId, (tx) =>
        tx.$executeRaw`DELETE FROM test_run WHERE execution_id = ${s.executionId}::uuid`,
      );

      const response = await api().post(`${s.base}/run-all`).set(as(s.contributor)).send({ mode: 'Manual' });

      expect(response.status).toBe(409);
    });

    it('a Viewer cannot start an execution (403)', async () => {
      const s = await setUp('Life-ViewerStart');
      await api().post(`${s.base}/mark-ready`).set(as(s.contributor));

      const response = await api().post(`${s.base}/run-all`).set(as(s.viewer)).send({ mode: 'Manual' });
      const detail = await api().get(s.base).set(as(s.viewer));

      expect(response.status).toBe(403);
      expect(detail.body.status).toBe('Ready');
    });

    it('of two concurrent Run All requests, exactly one succeeds', async () => {
      const s = await setUp('Life-Race');
      await api().post(`${s.base}/mark-ready`).set(as(s.contributor));

      const responses = await Promise.all([
        api().post(`${s.base}/run-all`).set(as(s.contributor)).send({ mode: 'Manual' }),
        api().post(`${s.base}/run-all`).set(as(s.admin)).send({ mode: 'Manual' }),
      ]);

      expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    });
  });

  describe('Pause and Resume', () => {
    it('pausing stops the clock and resuming restarts it from the same total', async () => {
      const s = await setUp('Life-Timer');
      await start(s);
      await sleep(30);

      const paused = await api().post(`${s.base}/pause`).set(as(s.contributor));
      await sleep(50);
      const whilePaused = await api().get(s.base).set(as(s.viewer));
      const resumed = await api().post(`${s.base}/resume`).set(as(s.contributor));

      expect(paused.body).toMatchObject({ status: 'Paused', lastResumedAt: null });
      expect(paused.body.elapsedMsAccumulated).toBeGreaterThan(0);
      expect(whilePaused.body.elapsedMsAccumulated).toBe(paused.body.elapsedMsAccumulated);
      expect(resumed.body.status).toBe('InProgress');
      expect(resumed.body.elapsedMsAccumulated).toBe(paused.body.elapsedMsAccumulated);
      expect(resumed.body.lastResumedAt).not.toBeNull();
    });
  });

  describe('run outcomes and completion', () => {
    it('records a Pass on an InProgress execution', async () => {
      const s = await setUp('Life-Pass');
      await start(s);
      const [first] = await runIds(s);

      const response = await setOutcome(s, first, 'Pass');

      expect(response.status).toBe(200);
      expect(response.body.runs[0].outcome).toBe('Pass');
      expect(response.body.status).toBe('InProgress');
      expect(await activityCodesFor(prisma, s.workspaceId, first)).toEqual(['test_run.outcome_set']);
    });

    it('refuses outcomes while Paused (409)', async () => {
      const s = await setUp('Life-PausedOutcome');
      await start(s);
      await api().post(`${s.base}/pause`).set(as(s.contributor));
      const [first] = await runIds(s);

      expect((await setOutcome(s, first, 'Pass')).status).toBe(409);
    });

    it('rejects resetting a run to Pending (400)', async () => {
      const s = await setUp('Life-Pending');
      await start(s);
      const [first] = await runIds(s);

      expect((await setOutcome(s, first, 'Pending')).status).toBe(400);
    });

    it('a Viewer cannot record outcomes (403)', async () => {
      const s = await setUp('Life-ViewerOutcome');
      await start(s);
      const [first] = await runIds(s);

      expect((await setOutcome(s, first, 'Pass', s.viewer)).status).toBe(403);
    });

    it('the last outcome completes the execution and stops the timer, Needs Review included', async () => {
      const s = await setUp('Life-Complete');
      await start(s);
      const [first, second] = await runIds(s);
      await setOutcome(s, first, 'Fail');

      const response = await setOutcome(s, second, 'NeedsReview');
      await sleep(30);
      const later = await api().get(s.base).set(as(s.viewer));

      expect(response.body).toMatchObject({ status: 'Completed', lastResumedAt: null });
      expect(response.body.completedAt).not.toBeNull();
      expect(later.body.elapsedMsAccumulated).toBe(response.body.elapsedMsAccumulated);
      expect(await activityCodesFor(prisma, s.workspaceId, s.executionId)).toContain('test_execution.completed');
      expect(await activityCodesFor(prisma, s.workspaceId, second)).toEqual(['test_run.outcome_set']);
    });

    it('two concurrent last outcomes still complete the execution', async () => {
      const s = await setUp('Life-OutcomeRace');
      await start(s);
      const [first, second] = await runIds(s);

      const responses = await Promise.all([setOutcome(s, first, 'Pass'), setOutcome(s, second, 'Pass')]);
      const detail = await api().get(s.base).set(as(s.viewer));

      expect(responses.map((r) => r.status)).toEqual([200, 200]);
      expect(detail.body.status).toBe('Completed');
    });
  });

  describe('Sign Off', () => {
    async function completed(label: string, outcomes: string[]): Promise<Setup> {
      const s = await setUp(label, outcomes.length);
      await start(s);
      const ids = await runIds(s);
      for (const [i, outcome] of outcomes.entries()) {
        await setOutcome(s, ids[i], outcome);
      }
      return s;
    }

    it('an Admin signs off a Completed execution with only Pass and Fail runs', async () => {
      const s = await completed('Life-SignOff', ['Pass', 'Fail']);

      const response = await api().post(`${s.base}/sign-off`).set(as(s.admin));

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Done');
      expect(response.body.signedOffAt).not.toBeNull();
      expect(response.body.signedOffBy).toEqual(expect.any(String));
      expect(await activityCodesFor(prisma, s.workspaceId, s.executionId)).toContain('test_execution.signed_off');
    });

    it('Needs Review blocks sign-off until it is resolved', async () => {
      const s = await completed('Life-SignOffReview', ['Pass', 'NeedsReview']);
      const [, reviewRun] = await runIds(s);

      const blocked = await api().post(`${s.base}/sign-off`).set(as(s.admin));
      const stillCompleted = await api().get(s.base).set(as(s.viewer));
      await setOutcome(s, reviewRun, 'Fail');
      const signed = await api().post(`${s.base}/sign-off`).set(as(s.admin));

      expect(blocked.status).toBe(409);
      expect(stillCompleted.body.status).toBe('Completed');
      expect(signed.body.status).toBe('Done');
    });

    it('a Contributor cannot sign off (403)', async () => {
      const s = await completed('Life-SignOffContrib', ['Pass']);

      expect((await api().post(`${s.base}/sign-off`).set(as(s.contributor))).status).toBe(403);
    });
  });
});
