import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject } from './helpers/cross-tenant-harness';
import { insertTestUser, insertWorkspaceMembership, insertProjectMembership } from './helpers/membership-fixtures';

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

async function setUpContributor(prisma: PrismaClient, workspaceId: string, projectId: string) {
  const clerkUserId = `clerk-tc-contrib-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, 'Contributor User');
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  await insertProjectMembership(prisma, workspaceId, projectId, userId, 'Contributor');
  return clerkUserId;
}

async function setUpViewer(prisma: PrismaClient, workspaceId: string, projectId: string) {
  const clerkUserId = `clerk-tc-viewer-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, 'Viewer User');
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  await insertProjectMembership(prisma, workspaceId, projectId, userId, 'Viewer');
  return clerkUserId;
}

async function setUpNoAccess(prisma: PrismaClient, workspaceId: string) {
  const clerkUserId = `clerk-tc-none-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, 'No Access User');
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  return clerkUserId;
}

async function setUpAdmin(prisma: PrismaClient, workspaceId: string, projectId: string) {
  const clerkUserId = `clerk-tc-admin-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, 'Admin User');
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  await insertProjectMembership(prisma, workspaceId, projectId, userId, 'Admin');
  return clerkUserId;
}

describe('test cases: create and list (e2e)', () => {
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

  it('a Contributor creates a test case with a script', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-Create-${randomUUID().slice(0, 8)}`);
    const clerkUserId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);

    const response = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/test-cases`)
      .set('Authorization', `Bearer ${clerkUserId}`)
      .send({ name: 'Login works', gherkinScript: 'Given a user\nWhen they log in\nThen they see the dashboard' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Login works',
      gherkinScript: expect.stringContaining('Given a user'),
      status: 'Draft',
      sourceType: 'Gherkin',
    });
  });

  it('a Contributor creates a test case with only a name', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-CreateNoScript-${randomUUID().slice(0, 8)}`);
    const clerkUserId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);

    const response = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/test-cases`)
      .set('Authorization', `Bearer ${clerkUserId}`)
      .send({ name: 'Manual smoke check' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Manual smoke check',
      gherkinScript: null,
      status: 'Draft',
      sourceType: 'Manual',
    });
  });

  it('a Viewer lists every non-deleted test case in the project', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-List-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const viewerId = await setUpViewer(prisma, fixture.workspaceId, fixture.projectId);

    await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/test-cases`)
      .set('Authorization', `Bearer ${contributorId}`)
      .send({ name: 'Case One' });
    await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/test-cases`)
      .set('Authorization', `Bearer ${contributorId}`)
      .send({ name: 'Case Two' });

    const response = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/test-cases`)
      .set('Authorization', `Bearer ${viewerId}`);

    expect(response.status).toBe(200);
    expect(response.body.map((tc: { name: string }) => tc.name).sort()).toEqual(['Case One', 'Case Two']);
  });

  it('a Viewer cannot create a test case (403)', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-ViewerDenied-${randomUUID().slice(0, 8)}`);
    const viewerId = await setUpViewer(prisma, fixture.workspaceId, fixture.projectId);

    const response = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/test-cases`)
      .set('Authorization', `Bearer ${viewerId}`)
      .send({ name: 'Should not be created' });

    expect(response.status).toBe(403);
  });

  it('a caller with no access gets 403 on the list', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-NoAccessList-${randomUUID().slice(0, 8)}`);
    const noAccessId = await setUpNoAccess(prisma, fixture.workspaceId);

    const response = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/test-cases`)
      .set('Authorization', `Bearer ${noAccessId}`);

    expect(response.status).toBe(403);
  });
});

describe('test cases: detail and update (e2e)', () => {
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

  async function createTestCase(
    projectId: string,
    contributorId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/test-cases`)
      .set('Authorization', `Bearer ${contributorId}`)
      .send(body);
    return response.body;
  }

  it('reports sourceType Gherkin for a test case with a script', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-DetailGherkin-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const created = await createTestCase(fixture.projectId, contributorId, {
      name: 'With script',
      gherkinScript: 'Given a user\nWhen they log in\nThen they see the dashboard',
    });

    const response = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${contributorId}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ sourceType: 'Gherkin' });
  });

  it('reports sourceType Manual for a test case with no script', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-DetailManual-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'No script' });

    const response = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${contributorId}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ sourceType: 'Manual' });
  });

  it('updating name and script together persists both', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-UpdateBoth-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'Original name' });

    const response = await request(app.getHttpServer())
      .patch(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${contributorId}`)
      .send({ name: 'Updated name', gherkinScript: 'Given X\nWhen Y\nThen Z' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: 'Updated name',
      gherkinScript: 'Given X\nWhen Y\nThen Z',
      sourceType: 'Gherkin',
    });
  });

  it('setting status to Ready persists it with no additional step', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-UpdateStatus-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'Ready me' });

    const response = await request(app.getHttpServer())
      .patch(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${contributorId}`)
      .send({ status: 'Ready' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'Ready' });
  });

  it('a Viewer cannot update a test case (403)', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-ViewerUpdateDenied-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const viewerId = await setUpViewer(prisma, fixture.workspaceId, fixture.projectId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'Protected' });

    const response = await request(app.getHttpServer())
      .patch(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${viewerId}`)
      .send({ name: 'Hijacked' });

    expect(response.status).toBe(403);
  });

  it('a caller with no access gets 403 on both detail and update', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-NoAccessDetail-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const noAccessId = await setUpNoAccess(prisma, fixture.workspaceId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'Hidden' });

    const detailResponse = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${noAccessId}`);
    const updateResponse = await request(app.getHttpServer())
      .patch(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${noAccessId}`)
      .send({ name: 'Should not work' });

    expect(detailResponse.status).toBe(403);
    expect(updateResponse.status).toBe(403);
  });
});

describe('test cases: delete (e2e)', () => {
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

  async function createTestCase(
    projectId: string,
    contributorId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/test-cases`)
      .set('Authorization', `Bearer ${contributorId}`)
      .send(body);
    return response.body;
  }

  it('an Admin deletes a test case and gets 204', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-Delete-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'To be deleted' });

    const response = await request(app.getHttpServer())
      .delete(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${adminId}`);

    expect(response.status).toBe(204);
  });

  it('a deleted test case no longer appears in the list or detail', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-DeleteHidden-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'Vanishing case' });

    await request(app.getHttpServer())
      .delete(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${adminId}`);

    const listResponse = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/test-cases`)
      .set('Authorization', `Bearer ${contributorId}`);
    const detailResponse = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${contributorId}`);

    expect(listResponse.body.map((tc: { id: string }) => tc.id)).not.toContain(created.id);
    expect(detailResponse.status).toBe(404);
  });

  it('deleting a nonexistent test case returns 404', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-DeleteMissing-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);

    const response = await request(app.getHttpServer())
      .delete(`/projects/${fixture.projectId}/test-cases/${randomUUID()}`)
      .set('Authorization', `Bearer ${adminId}`);

    expect(response.status).toBe(404);
  });

  it('deleting an already-deleted test case returns 404', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-DeleteTwice-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'Double delete' });

    await request(app.getHttpServer())
      .delete(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${adminId}`);

    const secondResponse = await request(app.getHttpServer())
      .delete(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${adminId}`);

    expect(secondResponse.status).toBe(404);
  });

  it('a Contributor cannot delete a test case (403)', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-DeleteContributorDenied-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'Protected from Contributor' });

    const response = await request(app.getHttpServer())
      .delete(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${contributorId}`);

    expect(response.status).toBe(403);
  });

  it('a Viewer cannot delete a test case (403)', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-DeleteViewerDenied-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const viewerId = await setUpViewer(prisma, fixture.workspaceId, fixture.projectId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'Protected from Viewer' });

    const response = await request(app.getHttpServer())
      .delete(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${viewerId}`);

    expect(response.status).toBe(403);
  });

  it('a caller with no access cannot delete a test case (403)', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `TC-DeleteNoAccessDenied-${randomUUID().slice(0, 8)}`);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const noAccessId = await setUpNoAccess(prisma, fixture.workspaceId);
    const created = await createTestCase(fixture.projectId, contributorId, { name: 'Protected from no access' });

    const response = await request(app.getHttpServer())
      .delete(`/projects/${fixture.projectId}/test-cases/${created.id}`)
      .set('Authorization', `Bearer ${noAccessId}`);

    expect(response.status).toBe(403);
  });

  /** An execution over one Ready test case, driven to `target` through the real endpoints. */
  async function executionIn(target: 'Draft' | 'Ready' | 'Completed' | 'Done') {
    const fixture = await createWorkspaceWithProject(prisma, `TC-DeleteActive-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);
    const server = request(app.getHttpServer());
    const auth = { Authorization: `Bearer ${adminId}` };
    const testCase = await createTestCase(fixture.projectId, adminId, { name: 'In an execution' });
    await server.patch(`/projects/${fixture.projectId}/test-cases/${testCase.id}`).set(auth).send({ status: 'Ready' });
    const execution = await server
      .post(`/projects/${fixture.projectId}/executions`)
      .set(auth)
      .send({ name: 'Uses it', testCaseIds: [testCase.id] });
    const base = `/projects/${fixture.projectId}/executions/${execution.body.id}`;

    if (target !== 'Draft') {
      await server.post(`${base}/mark-ready`).set(auth);
    }
    if (target === 'Completed' || target === 'Done') {
      await server.post(`${base}/run-all`).set(auth).send({ mode: 'Manual' });
      await server.patch(`${base}/runs/${execution.body.runs[0].id}`).set(auth).send({ outcome: 'Pass' });
    }
    if (target === 'Done') {
      await server.post(`${base}/sign-off`).set(auth);
    }
    return { fixture, auth, testCaseId: testCase.id };
  }

  it('deleting a test case in a Ready execution is refused (409) and it is not deleted', async () => {
    const { fixture, auth, testCaseId } = await executionIn('Ready');

    const response = await request(app.getHttpServer())
      .delete(`/projects/${fixture.projectId}/test-cases/${testCaseId}`)
      .set(auth);
    const detail = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/test-cases/${testCaseId}`)
      .set(auth);

    expect(response.status).toBe(409);
    expect(detail.status).toBe(200);
  });

  it.each(['Draft', 'Completed', 'Done'] as const)(
    'a test case only in a %s execution can be deleted (204)',
    async (status) => {
      const { fixture, auth, testCaseId } = await executionIn(status);

      const response = await request(app.getHttpServer())
        .delete(`/projects/${fixture.projectId}/test-cases/${testCaseId}`)
        .set(auth);

      expect(response.status).toBe(204);
    },
  );
});
