import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProjectAndDek } from './helpers/cross-tenant-harness';
import { insertTestUser, insertWorkspaceMembership, insertProjectMembership } from './helpers/membership-fixtures';
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

async function setUpAdmin(prisma: PrismaClient, workspaceId: string, projectId: string) {
  const clerkUserId = `clerk-reveal-admin-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, 'Admin User');
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  await insertProjectMembership(prisma, workspaceId, projectId, userId, 'Admin');
  return clerkUserId;
}

async function setUpContributor(prisma: PrismaClient, workspaceId: string, projectId: string) {
  const clerkUserId = `clerk-reveal-contrib-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, 'Contributor User');
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  await insertProjectMembership(prisma, workspaceId, projectId, userId, 'Contributor');
  return clerkUserId;
}

async function setUpViewer(prisma: PrismaClient, workspaceId: string, projectId: string) {
  const clerkUserId = `clerk-reveal-viewer-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, 'Viewer User');
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  await insertProjectMembership(prisma, workspaceId, projectId, userId, 'Viewer');
  return clerkUserId;
}

describe('environment credential reveal (e2e)', () => {
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

  async function createEnvironmentWithCredential(projectId: string, adminId: string, password: string) {
    const created = await request(app.getHttpServer())
      .post(`/projects/${projectId}/environments`)
      .set('Authorization', `Bearer ${adminId}`)
      .send({
        name: 'Env',
        baseUrl: 'https://example.com',
        defaultBrowser: 'Chromium',
        credentials: [{ alias: 'qa', email: 'qa@example.com', password }],
      });
    return { environmentId: created.body.id as string, credentialId: created.body.credentials[0].id as string };
  }

  async function countActivityEntries(workspaceId: string, credentialId: string): Promise<number> {
    const rows = await withTenantContext(prisma, workspaceId, (tx) =>
      tx.$queryRaw<{ count: bigint }[]>`SELECT count(*)::bigint AS count FROM activity_entries WHERE entity_id = ${credentialId}::uuid`,
    );
    return Number(rows[0].count);
  }

  it('a Contributor reveal returns the password, sets no-store, and writes exactly one activity entry (3.1)', async () => {
    const fixture = await createWorkspaceWithProjectAndDek(prisma, `Reveal-OK-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const { environmentId, credentialId } = await createEnvironmentWithCredential(
      fixture.projectId,
      adminId,
      'reveal-me-please',
    );

    const before = await countActivityEntries(fixture.workspaceId, credentialId);

    const response = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments/${environmentId}/credentials/${credentialId}/reveal`)
      .set('Authorization', `Bearer ${contributorId}`);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ password: 'reveal-me-please' });
    expect(response.headers['cache-control']).toBe('no-store');

    const after = await countActivityEntries(fixture.workspaceId, credentialId);
    expect(after).toBe(before + 1);

    const entries = await withTenantContext(prisma, fixture.workspaceId, (tx) =>
      tx.$queryRaw<
        { action_code: string; entity_type: string; entity_name: string; category: string; details: unknown }[]
      >`
        SELECT action_code, entity_type, entity_name, category, details FROM activity_entries
        WHERE entity_id = ${credentialId}::uuid
        ORDER BY created_at DESC LIMIT 1
      `,
    );
    expect(entries[0]).toMatchObject({
      action_code: 'environment_credential.revealed',
      entity_type: 'environment_credential',
      entity_name: 'qa',
      category: 'Environments',
    });
    expect(entries[0].details).toMatchObject({ environmentId });
  });

  it('a Viewer cannot reveal a password (3.2)', async () => {
    const fixture = await createWorkspaceWithProjectAndDek(prisma, `Reveal-Viewer-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);
    const viewerId = await setUpViewer(prisma, fixture.workspaceId, fixture.projectId);
    const { environmentId, credentialId } = await createEnvironmentWithCredential(fixture.projectId, adminId, 'secret');

    const response = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments/${environmentId}/credentials/${credentialId}/reveal`)
      .set('Authorization', `Bearer ${viewerId}`);

    expect(response.status).toBe(403);
    expect(response.body.password).toBeUndefined();
  });

  it('rate-limits reveals per user and writes no activity entry for the rejected attempt (3.3, 3.4)', async () => {
    const fixture = await createWorkspaceWithProjectAndDek(prisma, `Reveal-RateLimit-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const { environmentId, credentialId } = await createEnvironmentWithCredential(fixture.projectId, adminId, 'secret');

    const url = `/projects/${fixture.projectId}/environments/${environmentId}/credentials/${credentialId}/reveal`;

    for (let i = 0; i < 10; i += 1) {
      const response = await request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${contributorId}`);
      expect(response.status).toBe(201);
    }

    const beforeRejected = await countActivityEntries(fixture.workspaceId, credentialId);

    const rejected = await request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${contributorId}`);
    expect(rejected.status).toBe(429);

    const afterRejected = await countActivityEntries(fixture.workspaceId, credentialId);
    expect(afterRejected).toBe(beforeRejected);
  });

  it('a decryption failure leaves no activity entry (3.5)', async () => {
    const fixture = await createWorkspaceWithProjectAndDek(prisma, `Reveal-Corrupt-${randomUUID().slice(0, 8)}`);
    const adminId = await setUpAdmin(prisma, fixture.workspaceId, fixture.projectId);
    const contributorId = await setUpContributor(prisma, fixture.workspaceId, fixture.projectId);
    const { environmentId, credentialId } = await createEnvironmentWithCredential(fixture.projectId, adminId, 'secret');

    // Corrupt the stored ciphertext directly (simulating a binding/tampering failure)
    // bypassing the application layer on purpose, to exercise decrypt()'s failure path.
    await withTenantContext(prisma, fixture.workspaceId, (tx) =>
      tx.$executeRaw`
        UPDATE environment_credential SET password_ciphertext = 'v1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AAAA'
        WHERE id = ${credentialId}::uuid
      `,
    );

    const before = await countActivityEntries(fixture.workspaceId, credentialId);

    const response = await request(app.getHttpServer())
      .post(`/projects/${fixture.projectId}/environments/${environmentId}/credentials/${credentialId}/reveal`)
      .set('Authorization', `Bearer ${contributorId}`);

    expect(response.status).toBe(500);

    const after = await countActivityEntries(fixture.workspaceId, credentialId);
    expect(after).toBe(before);
  });
});
