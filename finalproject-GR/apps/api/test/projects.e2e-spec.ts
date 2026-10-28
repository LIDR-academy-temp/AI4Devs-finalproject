import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject } from './helpers/cross-tenant-harness';
import { withTenantContext } from '../src/common/tenant-context';
import { AppModule } from '../src/app.module';

async function insertTestUser(prisma: PrismaClient, clerkUserId: string, displayName: string): Promise<string> {
  const userId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    await tx.$executeRaw`INSERT INTO "user" (id, clerk_user_id, display_name, email)
      VALUES (${userId}::uuid, ${clerkUserId}, ${displayName}, ${`${clerkUserId}@example.com`})`;
  });
  return userId;
}

async function insertWorkspaceMembership(prisma: PrismaClient, workspaceId: string, userId: string, role: string) {
  await withTenantContext(prisma, workspaceId, (tx) =>
    tx.$executeRaw`INSERT INTO workspace_membership (workspace_id, user_id, role)
      VALUES (${workspaceId}::uuid, ${userId}::uuid, ${role})`,
  );
}

async function insertProjectMembership(
  prisma: PrismaClient,
  workspaceId: string,
  projectId: string,
  userId: string,
  role: string,
) {
  await withTenantContext(prisma, workspaceId, (tx) =>
    tx.$executeRaw`INSERT INTO project_membership (project_id, workspace_id, user_id, role)
      VALUES (${projectId}::uuid, ${workspaceId}::uuid, ${userId}::uuid, ${role})`,
  );
}

// Mocks Clerk at the boundary, same approach as me.e2e-spec.ts — the bearer token
// value stands in for the resolved Clerk user id; profile fields aren't exercised by
// this endpoint's own assertions.
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

describe('GET /projects/:projectId (e2e)', () => {
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

  it('an Owner with no explicit membership row gets 200', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Proj-Owner-${randomUUID().slice(0, 8)}`);
    const clerkUserId = `clerk-proj-owner-${randomUUID()}`;
    const userId = await insertTestUser(prisma, clerkUserId, 'Owner User');
    await insertWorkspaceMembership(prisma, fixture.workspaceId, userId, 'Owner');

    const response = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}`)
      .set('Authorization', `Bearer ${clerkUserId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: fixture.projectId,
      name: expect.any(String),
      slug: expect.any(String),
      role: 'Admin',
    });
  });

  it.each(['Viewer', 'Contributor', 'Admin'] as const)(
    'a Collaborator with an explicit %s project_membership row sees that role in the response',
    async (role) => {
      const fixture = await createWorkspaceWithProject(prisma, `Proj-Collab-${randomUUID().slice(0, 8)}`);
      const clerkUserId = `clerk-proj-collab-${randomUUID()}`;
      const userId = await insertTestUser(prisma, clerkUserId, 'Collaborator User');
      await insertWorkspaceMembership(prisma, fixture.workspaceId, userId, 'Collaborator');
      await insertProjectMembership(prisma, fixture.workspaceId, fixture.projectId, userId, role);

      const response = await request(app.getHttpServer())
        .get(`/projects/${fixture.projectId}`)
        .set('Authorization', `Bearer ${clerkUserId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(fixture.projectId);
      expect(response.body.role).toBe(role);
    },
  );

  it('a Collaborator with zero project_membership rows gets 403', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Proj-None-${randomUUID().slice(0, 8)}`);
    const clerkUserId = `clerk-proj-none-${randomUUID()}`;
    const userId = await insertTestUser(prisma, clerkUserId, 'No Access User');
    await insertWorkspaceMembership(prisma, fixture.workspaceId, userId, 'Collaborator');

    const response = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}`)
      .set('Authorization', `Bearer ${clerkUserId}`);

    expect(response.status).toBe(403);
  });
});

describe('project management (e2e)', () => {
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

  interface Setup {
    workspaceId: string;
    projectId: string;
    owner: string;
  }

  const as = (clerkUserId: string) => ({ Authorization: `Bearer ${clerkUserId}` });

  /** A workspace with one project ("<label> Project") and its Owner. */
  async function setUp(label: string): Promise<Setup> {
    const fixture = await createWorkspaceWithProject(prisma, `${label}-${randomUUID().slice(0, 8)}`);
    const owner = `clerk-pm-owner-${randomUUID()}`;
    const ownerId = await insertTestUser(prisma, owner, 'Olivia Owner');
    await insertWorkspaceMembership(prisma, fixture.workspaceId, ownerId, 'Owner');
    return { ...fixture, owner };
  }

  async function addCollaborator(s: Setup, projectRole?: string, projectId = s.projectId): Promise<string> {
    const clerkUserId = `clerk-pm-collab-${randomUUID()}`;
    const userId = await insertTestUser(prisma, clerkUserId, 'Cole Collaborator');
    await insertWorkspaceMembership(prisma, s.workspaceId, userId, 'Collaborator');
    if (projectRole) {
      await insertProjectMembership(prisma, s.workspaceId, projectId, userId, projectRole);
    }
    return clerkUserId;
  }

  const create = (s: Setup, name: string, user = s.owner) =>
    request(app.getHttpServer()).post('/projects').set(as(user)).send({ name });

  async function entries(s: Setup, projectId: string) {
    return withTenantContext(prisma, s.workspaceId, (tx) =>
      tx.$queryRaw<{ action_code: string; details: unknown; actor_display_name: string }[]>`
        SELECT action_code, details, actor_display_name FROM activity_entries
        WHERE entity_id = ${projectId}::uuid ORDER BY created_at`,
    );
  }

  describe('GET /projects', () => {
    it('lists every live project to the Owner as Admin, sorted by name, without trashed ones', async () => {
      const s = await setUp('PM-List');
      const zeta = (await create(s, 'Zeta')).body;
      const alpha = (await create(s, 'alpha')).body;
      const trashed = (await create(s, 'Trashed')).body;
      await request(app.getHttpServer()).delete(`/projects/${trashed.id}`).set(as(s.owner));

      const response = await request(app.getHttpServer()).get('/projects').set(as(s.owner));

      expect(response.status).toBe(200);
      // "PM-List-xxxx Project" sorts between "alpha" and "Zeta", ignoring case.
      expect(response.body.map((p: { id: string }) => p.id)).toEqual([alpha.id, s.projectId, zeta.id]);
      expect(response.body.every((p: { role: string }) => p.role === 'Admin')).toBe(true);
    });

    it('lists only the projects a Collaborator is a member of, with their role', async () => {
      const s = await setUp('PM-ListCollab');
      const second = (await create(s, 'Second')).body;
      const collaborator = await addCollaborator(s, 'Viewer', second.id);

      const response = await request(app.getHttpServer()).get('/projects').set(as(collaborator));

      expect(response.body).toEqual([{ id: second.id, name: 'Second', slug: 'second', role: 'Viewer' }]);
    });
  });

  describe('POST /projects', () => {
    it('derives the slug, suffixes it on collision even with a trashed project, and logs the creation', async () => {
      const s = await setUp('PM-Create');
      const first = await create(s, 'Mobile App');
      await request(app.getHttpServer()).delete(`/projects/${first.body.id}`).set(as(s.owner));
      const second = await create(s, 'Mobile App');

      expect(first.status).toBe(201);
      expect(first.body).toEqual({ id: expect.any(String), name: 'Mobile App', slug: 'mobile-app', role: 'Admin' });
      expect(second.body.slug).toBe('mobile-app-2');
      expect((await entries(s, first.body.id))[0]).toEqual({
        action_code: 'project.created',
        details: { slug: 'mobile-app' },
        actor_display_name: 'Olivia Owner',
      });
    });

    it('refuses a Collaborator with 403 and a blank name with 400', async () => {
      const s = await setUp('PM-CreateDenied');
      const collaborator = await addCollaborator(s, 'Admin');

      expect((await create(s, 'Nope', collaborator)).status).toBe(403);
      expect((await create(s, '   ')).status).toBe(400);
    });
  });

  describe('PATCH /projects/:projectId', () => {
    it('lets an Admin rename, keeping the slug, and logs from/to', async () => {
      const s = await setUp('PM-Rename');
      const project = (await create(s, 'Mobile App')).body;
      const admin = await addCollaborator(s, 'Admin', project.id);

      const response = await request(app.getHttpServer())
        .patch(`/projects/${project.id}`)
        .set(as(admin))
        .send({ name: 'Mobile App v2' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: project.id, name: 'Mobile App v2', slug: 'mobile-app', role: 'Admin' });
      const log = await entries(s, project.id);
      expect(log[log.length - 1]).toMatchObject({
        action_code: 'project.renamed',
        details: { from: 'Mobile App', to: 'Mobile App v2' },
      });
    });

    it('refuses a Contributor with 403', async () => {
      const s = await setUp('PM-RenameDenied');
      const contributor = await addCollaborator(s, 'Contributor');

      const response = await request(app.getHttpServer())
        .patch(`/projects/${s.projectId}`)
        .set(as(contributor))
        .send({ name: 'Renamed' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE and restore', () => {
    it('moves a project to the trash, closes it, and brings it back with its test cases', async () => {
      const s = await setUp('PM-Delete');
      const project = (await create(s, 'Old App')).body;
      const testCaseId = randomUUID();
      await withTenantContext(prisma, s.workspaceId, (tx) =>
        tx.$executeRaw`INSERT INTO test_case (id, project_id, workspace_id, name, position_key)
          VALUES (${testCaseId}::uuid, ${project.id}::uuid, ${s.workspaceId}::uuid, 'Login works', 'k0')`,
      );
      const server = request(app.getHttpServer());

      const deleted = await server.delete(`/projects/${project.id}`).set(as(s.owner));
      const closed = await server.get(`/projects/${project.id}/test-cases`).set(as(s.owner));
      const restored = await server.post(`/projects/${project.id}/restore`).set(as(s.owner));
      const reopened = await server.get(`/projects/${project.id}/test-cases`).set(as(s.owner));

      expect(deleted.status).toBe(204);
      expect(closed.status).toBe(403);
      expect(restored.status).toBe(201);
      expect(restored.body).toEqual({ id: project.id, name: 'Old App', slug: 'old-app', role: 'Admin' });
      expect(reopened.status).toBe(200);
      expect(reopened.body.map((tc: { id: string }) => tc.id)).toEqual([testCaseId]);
      expect((await entries(s, project.id)).map((e) => e.action_code)).toEqual([
        'project.created',
        'project.deleted',
        'project.restored',
      ]);
    });

    it('refuses to delete the last live project with 409', async () => {
      const s = await setUp('PM-Last');

      const response = await request(app.getHttpServer()).delete(`/projects/${s.projectId}`).set(as(s.owner));

      expect(response.status).toBe(409);
      expect((await request(app.getHttpServer()).get('/projects').set(as(s.owner))).body).toHaveLength(1);
    });

    it('refuses a Collaborator with an Admin membership, and a restore of a live project', async () => {
      const s = await setUp('PM-DeleteDenied');
      const project = (await create(s, 'Second')).body;
      const admin = await addCollaborator(s, 'Admin', project.id);
      const server = request(app.getHttpServer());

      expect((await server.delete(`/projects/${project.id}`).set(as(admin))).status).toBe(403);
      expect((await server.post(`/projects/${project.id}/restore`).set(as(s.owner))).status).toBe(409);
    });

    it("refuses every route on another workspace's project", async () => {
      const mine = await setUp('PM-TenantA');
      const theirs = await setUp('PM-TenantB');
      const extra = (await create(theirs, 'Extra')).body;
      const server = request(app.getHttpServer());

      const statuses = [
        (await server.patch(`/projects/${extra.id}`).set(as(mine.owner)).send({ name: 'x' })).status,
        (await server.delete(`/projects/${extra.id}`).set(as(mine.owner))).status,
        (await server.post(`/projects/${extra.id}/restore`).set(as(mine.owner))).status,
      ];

      expect(statuses).toEqual([403, 403, 403]);
      const listed = (await server.get('/projects').set(as(mine.owner))).body.map((p: { id: string }) => p.id);
      expect(listed).toEqual([mine.projectId]);
    });
  });
});
