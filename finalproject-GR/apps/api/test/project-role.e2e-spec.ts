import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject } from './helpers/cross-tenant-harness';
import { withTenantContext } from '../src/common/tenant-context';
import { resolveEffectiveProjectRole } from '../src/common/project-role';

/** Not withUserContext's own bootstrap — same inline pattern used by tenant-base-schema's FK test. */
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

async function setProjectDeleted(prisma: PrismaClient, workspaceId: string, projectId: string, deleted: boolean) {
  await withTenantContext(prisma, workspaceId, (tx) =>
    tx.$executeRaw`UPDATE project SET deleted_at = ${deleted ? new Date() : null} WHERE id = ${projectId}::uuid`,
  );
}

describe('resolveEffectiveProjectRole (e2e)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('resolves an Owner with no explicit membership row to Admin', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Role-Owner-${randomUUID().slice(0, 8)}`);
    const ownerId = await insertTestUser(prisma, `clerk-owner-${randomUUID()}`, 'Owner User');
    await insertWorkspaceMembership(prisma, fixture.workspaceId, ownerId, 'Owner');

    const role = await resolveEffectiveProjectRole(prisma, ownerId, fixture.projectId);

    expect(role).toBe('Admin');
  });

  it('resolves a Collaborator with an explicit Contributor row to Contributor', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Role-Collab-${randomUUID().slice(0, 8)}`);
    const collaboratorId = await insertTestUser(prisma, `clerk-collab-${randomUUID()}`, 'Collaborator User');
    await insertWorkspaceMembership(prisma, fixture.workspaceId, collaboratorId, 'Collaborator');
    await insertProjectMembership(prisma, fixture.workspaceId, fixture.projectId, collaboratorId, 'Contributor');

    const role = await resolveEffectiveProjectRole(prisma, collaboratorId, fixture.projectId);

    expect(role).toBe('Contributor');
  });

  it('resolves an Owner to null on a project in the trash', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Role-Trash-${randomUUID().slice(0, 8)}`);
    const ownerId = await insertTestUser(prisma, `clerk-trash-${randomUUID()}`, 'Owner User');
    await insertWorkspaceMembership(prisma, fixture.workspaceId, ownerId, 'Owner');
    await setProjectDeleted(prisma, fixture.workspaceId, fixture.projectId, true);

    const role = await resolveEffectiveProjectRole(prisma, ownerId, fixture.projectId);

    expect(role).toBeNull();
  });

  it("gives a Collaborator their Contributor role back once the project is restored", async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Role-Restore-${randomUUID().slice(0, 8)}`);
    const collaboratorId = await insertTestUser(prisma, `clerk-restore-${randomUUID()}`, 'Collaborator User');
    await insertWorkspaceMembership(prisma, fixture.workspaceId, collaboratorId, 'Collaborator');
    await insertProjectMembership(prisma, fixture.workspaceId, fixture.projectId, collaboratorId, 'Contributor');

    await setProjectDeleted(prisma, fixture.workspaceId, fixture.projectId, true);
    expect(await resolveEffectiveProjectRole(prisma, collaboratorId, fixture.projectId)).toBeNull();

    await setProjectDeleted(prisma, fixture.workspaceId, fixture.projectId, false);
    expect(await resolveEffectiveProjectRole(prisma, collaboratorId, fixture.projectId)).toBe('Contributor');
  });

  it('resolves a Collaborator with no project_membership row to null', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Role-None-${randomUUID().slice(0, 8)}`);
    const collaboratorId = await insertTestUser(prisma, `clerk-none-${randomUUID()}`, 'No Access User');
    await insertWorkspaceMembership(prisma, fixture.workspaceId, collaboratorId, 'Collaborator');

    const role = await resolveEffectiveProjectRole(prisma, collaboratorId, fixture.projectId);

    expect(role).toBeNull();
  });
});
