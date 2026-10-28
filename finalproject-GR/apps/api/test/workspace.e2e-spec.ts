import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject } from './helpers/cross-tenant-harness';
import { insertTestUser, insertWorkspaceMembership } from './helpers/membership-fixtures';
import { insertTestCases } from './helpers/execution-fixtures';
import { withTenantContext } from '../src/common/tenant-context';
import { AppModule } from '../src/app.module';

// Clerk mocked at the boundary, as in me.e2e-spec.ts: the bearer token is the Clerk user id.
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

describe('workspace administration (e2e)', () => {
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

  const as = (clerkUserId: string) => ({ Authorization: `Bearer ${clerkUserId}` });

  async function setUp(label: string) {
    const name = `${label}-${randomUUID().slice(0, 8)}`;
    const fixture = await createWorkspaceWithProject(prisma, name);
    const owner = `clerk-ws-owner-${randomUUID()}`;
    await insertWorkspaceMembership(prisma, fixture.workspaceId, await insertTestUser(prisma, owner, 'Olivia Owner'), 'Owner');
    const collaborator = `clerk-ws-collab-${randomUUID()}`;
    await insertWorkspaceMembership(
      prisma,
      fixture.workspaceId,
      await insertTestUser(prisma, collaborator, 'Cole Collaborator'),
      'Collaborator',
    );
    return { ...fixture, name, owner, collaborator };
  }

  it("returns the workspace's name and the caller's role", async () => {
    const s = await setUp('WS-Read');

    const response = await request(app.getHttpServer()).get('/workspace').set(as(s.collaborator));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: s.workspaceId, name: s.name, role: 'Collaborator' });
  });

  it('lets the Owner rename the workspace and logs from/to; refuses a Collaborator and a blank name', async () => {
    const s = await setUp('WS-Rename');
    const server = request(app.getHttpServer());

    const renamed = await server.patch('/workspace').set(as(s.owner)).send({ name: '  Acme QA  ' });
    const denied = await server.patch('/workspace').set(as(s.collaborator)).send({ name: 'Mine' });
    const blank = await server.patch('/workspace').set(as(s.owner)).send({ name: ' ' });

    expect(renamed.status).toBe(200);
    expect(renamed.body).toEqual({ id: s.workspaceId, name: 'Acme QA', role: 'Owner' });
    expect(denied.status).toBe(403);
    expect(blank.status).toBe(400);
    const [entry] = await withTenantContext(prisma, s.workspaceId, (tx) =>
      tx.$queryRaw<{ action_code: string; category: string; project_id: string | null; details: unknown }[]>`
        SELECT action_code, category, project_id, details FROM activity_entries WHERE entity_id = ${s.workspaceId}::uuid`,
    );
    expect(entry).toEqual({
      action_code: 'workspace.renamed',
      category: 'Workspace',
      project_id: null,
      details: { from: s.name, to: 'Acme QA' },
    });
  });

  it('counts only live test cases and executions per project', async () => {
    const s = await setUp('WS-Counts');
    const [live, trashed] = await insertTestCases(prisma, s.workspaceId, s.projectId, ['Live', 'Trashed', 'Other']);
    await withTenantContext(prisma, s.workspaceId, (tx) =>
      tx.$executeRaw`UPDATE test_case SET deleted_at = now() WHERE id = ${trashed}::uuid`,
    );
    const server = request(app.getHttpServer());
    const execution = await server
      .post(`/projects/${s.projectId}/executions`)
      .set(as(s.owner))
      .send({ name: 'Smoke run', testCaseIds: [live] });
    expect(execution.status).toBe(201);

    const response = await server.get('/workspace/projects').set(as(s.owner));

    expect(response.status).toBe(200);
    expect(response.body.projects).toEqual([
      { id: s.projectId, name: `${s.name} Project`, slug: expect.any(String), testCaseCount: 2, executionCount: 1 },
    ]);
    expect(response.body.deleted).toEqual([]);
  });

  it('lists a project deleted two days ago with its deleter and 28 days left; refuses a Collaborator', async () => {
    const s = await setUp('WS-Trash');
    const server = request(app.getHttpServer());
    const old = (await server.post('/projects').set(as(s.owner)).send({ name: 'Old App' })).body;
    await server.delete(`/projects/${old.id}`).set(as(s.owner));
    await withTenantContext(prisma, s.workspaceId, (tx) =>
      tx.$executeRaw`UPDATE project SET deleted_at = now() - interval '2 days 1 hour' WHERE id = ${old.id}::uuid`,
    );

    const response = await server.get('/workspace/projects').set(as(s.owner));
    const denied = await server.get('/workspace/projects').set(as(s.collaborator));

    expect(response.body.projects.map((p: { id: string }) => p.id)).toEqual([s.projectId]);
    expect(response.body.deleted).toEqual([
      {
        id: old.id,
        name: 'Old App',
        deletedAt: expect.any(String),
        deletedBy: { id: expect.any(String), displayName: 'Olivia Owner' },
        daysLeft: 28,
      },
    ]);
    expect(denied.status).toBe(403);
  });
});
