import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { withTenantContext } from '../src/common/tenant-context';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { insertWorkspaceMembership } from './helpers/membership-fixtures';

// Mocks Clerk at the boundary (design.md's corrected Risk resolution): the real
// session-JWT verification against live Clerk JWKS needs a live account and either a
// browser or Clerk's ticket-redemption flow — neither of which is a simple backend
// call. Everything downstream of "the token resolved to this Clerk user id" (the
// guard's own logic, provisionIdentity, real Postgres) is exercised for real.
jest.mock('@clerk/backend', () => ({
  // The bearer token value itself stands in for the resolved Clerk user id.
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

describe('GET /me (e2e, Clerk mocked at the boundary)', () => {
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

  it('provisions a new identity on first contact and returns its profile', async () => {
    const clerkUserId = `clerk-me-${randomUUID()}`;

    const response = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${clerkUserId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(String),
      displayName: 'Test User',
      email: `${clerkUserId}@example.com`,
      workspaceId: expect.any(String),
      workspaceName: "Test User's Workspace",
      workspaceRole: 'Owner',
      projectId: expect.any(String),
    });
  });

  it('is idempotent: calling twice for the same identity returns the same workspaceId and projectId', async () => {
    const clerkUserId = `clerk-me-${randomUUID()}`;

    const first = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${clerkUserId}`);
    const second = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${clerkUserId}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.workspaceId).toBe(first.body.workspaceId);
    expect(second.body.projectId).toBe(first.body.projectId);
  });

  describe('PUT /me/active-project', () => {
    const asUser = (clerkUserId: string) => ({ Authorization: `Bearer ${clerkUserId}` });

    async function addProject(workspaceId: string, deleted = false): Promise<string> {
      const projectId = randomUUID();
      await withTenantContext(prisma, workspaceId, (tx) =>
        tx.$executeRaw`INSERT INTO project (id, workspace_id, name, slug, deleted_at)
          VALUES (${projectId}::uuid, ${workspaceId}::uuid, 'Other', ${`other-${projectId}`}, ${deleted ? new Date() : null})`,
      );
      return projectId;
    }

    async function switchTo(clerkUserId: string, projectId: string) {
      return request(app.getHttpServer()).put('/me/active-project').set(asUser(clerkUserId)).send({ projectId });
    }

    it('switches to an accessible project, and /me then reports it', async () => {
      const clerkUserId = `clerk-me-switch-${randomUUID()}`;
      const me = await request(app.getHttpServer()).get('/me').set(asUser(clerkUserId));
      const other = await addProject(me.body.workspaceId);

      const response = await switchTo(clerkUserId, other);
      const after = await request(app.getHttpServer()).get('/me').set(asUser(clerkUserId));

      expect(response.status).toBe(204);
      expect(after.body.projectId).toBe(other);
    });

    it('refuses a project with no membership, one in the trash, or an unknown one, leaving the active project alone', async () => {
      const owner = await request(app.getHttpServer()).get('/me').set(asUser(`clerk-me-owner-${randomUUID()}`));
      const collaborator = `clerk-me-collab-${randomUUID()}`;
      const collaboratorMe = await request(app.getHttpServer()).get('/me').set(asUser(collaborator));
      await insertWorkspaceMembership(prisma, owner.body.workspaceId, collaboratorMe.body.id, 'Collaborator');
      const trashed = await addProject(collaboratorMe.body.workspaceId, true);

      for (const projectId of [owner.body.projectId, trashed, randomUUID(), 'not-a-uuid']) {
        expect((await switchTo(collaborator, projectId)).status).toBe(403);
      }
      const after = await request(app.getHttpServer()).get('/me').set(asUser(collaborator));
      expect(after.body.projectId).toBe(collaboratorMe.body.projectId);
    });
  });
});
