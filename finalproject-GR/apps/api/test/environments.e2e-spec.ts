import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProjectAndDek as createWorkspaceWithProject } from './helpers/cross-tenant-harness';
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

async function setUpAdmin(prisma: PrismaClient, workspaceId: string, projectId: string) {
  const clerkUserId = `clerk-env-admin-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, 'Admin User');
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  await insertProjectMembership(prisma, workspaceId, projectId, userId, 'Admin');
  return clerkUserId;
}

async function setUpContributor(prisma: PrismaClient, workspaceId: string, projectId: string) {
  const clerkUserId = `clerk-env-contrib-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, 'Contributor User');
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  await insertProjectMembership(prisma, workspaceId, projectId, userId, 'Contributor');
  return clerkUserId;
}

async function setUpViewer(prisma: PrismaClient, workspaceId: string, projectId: string) {
  const clerkUserId = `clerk-env-viewer-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, 'Viewer User');
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  await insertProjectMembership(prisma, workspaceId, projectId, userId, 'Viewer');
  return clerkUserId;
}

describe('environments: CRUD (e2e)', () => {
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

  it('an Admin creates an environment with a credential, and it never exposes the password (2.1)', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Env-Create-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);

    const createResponse = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({
        name: 'Staging',
        baseUrl: 'https://staging.example.com',
        defaultBrowser: 'Chromium',
        credentials: [{ alias: 'qa-lead', email: 'qa-lead@example.com', password: 'super-secret-1' }],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      name: 'Staging',
      baseUrl: 'https://staging.example.com',
      defaultBrowser: 'Chromium',
    });
    expect(createResponse.body.credentials).toEqual([
      { id: expect.any(String), alias: 'qa-lead', email: 'qa-lead@example.com' },
    ]);
    expect(JSON.stringify(createResponse.body)).not.toContain('super-secret-1');

    const environmentId = createResponse.body.id;

    const listResponse = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/environments`)
      .set('Authorization', `Bearer ${adminId}`);
    expect(listResponse.status).toBe(200);
    expect(JSON.stringify(listResponse.body)).not.toContain('super-secret-1');

    const detailResponse = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/environments/${environmentId}`)
      .set('Authorization', `Bearer ${adminId}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.credentials).toEqual([
      { id: expect.any(String), alias: 'qa-lead', email: 'qa-lead@example.com' },
    ]);
    expect(JSON.stringify(detailResponse.body)).not.toContain('super-secret-1');
  });

  it('PATCH adds a credential and leaves an existing one unchanged when password is omitted (2.2)', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Env-Patch-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);

    const created = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({
        name: 'QA',
        baseUrl: 'https://qa.example.com',
        defaultBrowser: 'Firefox',
        credentials: [{ alias: 'original', email: 'orig@example.com', password: 'original-password' }],
      });
    const environmentId = created.body.id;
    const originalCredentialId = created.body.credentials[0].id;

    const patchResponse = await request(app.getHttpServer())
      .patch(`/projects/${fixture.projectId}/environments/${environmentId}`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({
        credentials: [
          { id: originalCredentialId, alias: 'original', email: 'updated@example.com' },
          { alias: 'second', email: 'second@example.com', password: 'second-password' },
        ],
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.credentials).toEqual(
      expect.arrayContaining([
        { id: originalCredentialId, alias: 'original', email: 'updated@example.com' },
        { id: expect.any(String), alias: 'second', email: 'second@example.com' },
      ]),
    );

    // Reveal the untouched credential (Contributor+ per ADR 0004) and confirm the
    // original password survived the PATCH that omitted it.
    const reveal = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments/${environmentId}/credentials/${originalCredentialId}/reveal`)
      .set('Authorization', `Bearer ${contributorId}`);
    expect(reveal.status).toBe(201);
    expect(reveal.body.password).toBe('original-password');
  });

  it('PATCH rejects an empty-string password on an existing credential', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Env-PatchEmptyPw-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);

    const created = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({
        name: 'Env',
        baseUrl: 'https://example.com',
        defaultBrowser: 'WebKit',
        credentials: [{ alias: 'a', email: 'a@example.com', password: 'pw' }],
      });
    const environmentId = created.body.id;
    const credentialId = created.body.credentials[0].id;

    const patchResponse = await request(app.getHttpServer())
      .patch(`/projects/${fixture.projectId}/environments/${environmentId}`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({ credentials: [{ id: credentialId, alias: 'a', email: 'a@example.com', password: '' }] });

    expect(patchResponse.status).toBe(400);
  });

  it('DELETE removes the environment and cascades to its credentials (2.3)', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Env-Delete-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);

    const created = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({
        name: 'ToDelete',
        baseUrl: 'https://example.com',
        defaultBrowser: 'Chromium',
        credentials: [{ alias: 'a', email: 'a@example.com', password: 'pw' }],
      });
    const environmentId = created.body.id;
    const credentialId = created.body.credentials[0].id;

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/projects/${fixture.projectId}/environments/${environmentId}`)
      .set('Authorization', `Bearer ${adminId}`);
    expect(deleteResponse.status).toBe(204);

    const listResponse = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/environments`)
      .set('Authorization', `Bearer ${adminId}`);
    expect(listResponse.body.map((e: { id: string }) => e.id)).not.toContain(environmentId);

    const credentialRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM environment_credential WHERE id = ${credentialId}::uuid
    `;
    expect(credentialRows).toHaveLength(0);
  });

  it('rejects a duplicate alias within the same environment (2.4)', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Env-DupAlias-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);

    const createResponse = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({
        name: 'Env',
        baseUrl: 'https://example.com',
        defaultBrowser: 'Chromium',
        credentials: [
          { alias: 'dup', email: 'a@example.com', password: 'pw' },
          { alias: 'dup', email: 'b@example.com', password: 'pw2' },
        ],
      });
    expect(createResponse.status).toBe(400);

    const okCreate = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({
        name: 'Env2',
        baseUrl: 'https://example.com',
        defaultBrowser: 'Chromium',
        credentials: [{ alias: 'existing', email: 'a@example.com', password: 'pw' }],
      });
    expect(okCreate.status).toBe(201);

    const patchDup = await request(app.getHttpServer())
      .patch(`/projects/${fixture.projectId}/environments/${okCreate.body.id}`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({
        credentials: [
          { id: okCreate.body.credentials[0].id, alias: 'existing', email: 'a@example.com' },
          { alias: 'existing', email: 'c@example.com', password: 'pw3' },
        ],
      });
    expect(patchDup.status).toBe(400);
  });

  it('Contributor and Viewer get 403 on write routes; Viewer gets 200 on read routes (2.5)', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Env-RoleGate-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const viewerId = await setUpViewer(prisma, fixture.workspaceId, fixture.projectId);

    const created = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({ name: 'Env', baseUrl: 'https://example.com', defaultBrowser: 'Chromium' });
    const environmentId = created.body.id;

    for (const userId of [contributorId, viewerId]) {
      const createAttempt = await request(app.getHttpServer())
        .post(`/projects/${fixture.projectId}/environments`)
        .set('Authorization', `Bearer ${userId}`)
        .send({ name: 'Nope', baseUrl: 'https://example.com', defaultBrowser: 'Chromium' });
      expect(createAttempt.status).toBe(403);

      const patchAttempt = await request(app.getHttpServer())
        .patch(`/projects/${fixture.projectId}/environments/${environmentId}`)
        .set('Authorization', `Bearer ${userId}`)
        .send({ name: 'Nope' });
      expect(patchAttempt.status).toBe(403);

      const deleteAttempt = await request(app.getHttpServer())
        .delete(`/projects/${fixture.projectId}/environments/${environmentId}`)
        .set('Authorization', `Bearer ${userId}`);
      expect(deleteAttempt.status).toBe(403);
    }

    const viewerList = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/environments`)
      .set('Authorization', `Bearer ${viewerId}`);
    expect(viewerList.status).toBe(200);

    const viewerDetail = await request(app.getHttpServer())
      .get(`/projects/${fixture.projectId}/environments/${environmentId}`)
      .set('Authorization', `Bearer ${viewerId}`);
    expect(viewerDetail.status).toBe(200);
  });

  it('a workspace cannot list, fetch, update, or delete another workspace\'s environments (2.6)', async () => {
    const a = await createWorkspaceWithProject(prisma, `Env-IsoA-${randomUUID().slice(0, 8)}`);
    const b = await createWorkspaceWithProject(prisma, `Env-IsoB-${randomUUID().slice(0, 8)}`);
    const adminA = await setUpAdmin(prisma, a.workspaceId, a.projectId);
    const adminB = await setUpAdmin(prisma, b.workspaceId, b.projectId);

    const createdInA = await request(app.getHttpServer())
      .post(`/projects/${a.projectId}/environments`)
      .set('Authorization', `Bearer ${adminA}`)
      .send({ name: 'A-Env', baseUrl: 'https://a.example.com', defaultBrowser: 'Chromium' });
    const environmentIdInA = createdInA.body.id;

    // B has no membership on A's project, so resolveProjectWorkspaceId's own
    // user-scoped lookup already denies it via ProjectRoleGuard (403), before any
    // cross-tenant data access is attempted.
    const crossList = await request(app.getHttpServer())
      .get(`/projects/${a.projectId}/environments`)
      .set('Authorization', `Bearer ${adminB}`);
    expect(crossList.status).toBe(403);

    const crossDetail = await request(app.getHttpServer())
      .get(`/projects/${a.projectId}/environments/${environmentIdInA}`)
      .set('Authorization', `Bearer ${adminB}`);
    expect(crossDetail.status).toBe(403);

    const crossPatch = await request(app.getHttpServer())
      .patch(`/projects/${a.projectId}/environments/${environmentIdInA}`)
      .set('Authorization', `Bearer ${adminB}`)
      .send({ name: 'Hijacked' });
    expect(crossPatch.status).toBe(403);

    const crossDelete = await request(app.getHttpServer())
      .delete(`/projects/${a.projectId}/environments/${environmentIdInA}`)
      .set('Authorization', `Bearer ${adminB}`);
    expect(crossDelete.status).toBe(403);
  });
});
