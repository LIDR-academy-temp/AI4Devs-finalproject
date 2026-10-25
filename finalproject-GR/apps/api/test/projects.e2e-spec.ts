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
