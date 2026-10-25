import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { withTenantContext } from '../../src/common/tenant-context';
import { createWorkspaceDek } from '../../src/common/secrets-encryption';

export interface WorkspaceFixture {
  workspaceId: string;
  projectId: string;
}

/**
 * Creates one workspace with one project, entirely through withTenantContext — the
 * workspace's own id is generated client-side and used as the context *before* the
 * insert, so the row's own RLS WITH CHECK (id = app.workspace_id) passes (design.md's
 * "bootstrapping" pattern, applied to workspace creation). Reused by every future
 * change's cross-tenant tests (ADR 0003).
 */
export async function createWorkspaceWithProject(
  prisma: PrismaClient,
  label: string,
): Promise<WorkspaceFixture> {
  const workspaceId = randomUUID();
  const projectId = randomUUID();

  await withTenantContext(prisma, workspaceId, async (tx) => {
    await tx.$executeRaw`INSERT INTO workspace (id, name) VALUES (${workspaceId}::uuid, ${label})`;
    await tx.$executeRaw`INSERT INTO project (id, workspace_id, name, slug)
      VALUES (${projectId}::uuid, ${workspaceId}::uuid, ${`${label} Project`}, ${`${label.toLowerCase()}-project`})`;
  });

  return { workspaceId, projectId };
}

/**
 * Same as createWorkspaceWithProject, plus a workspace_dek row — needed by any test
 * that calls secrets-encryption's encrypt()/decrypt() (environment-credentials and
 * later secret-holding features), since createWorkspaceWithProject's raw INSERTs
 * bypass provisionIdentity, the only other place a DEK is normally created.
 */
export async function createWorkspaceWithProjectAndDek(prisma: PrismaClient, label: string): Promise<WorkspaceFixture> {
  const fixture = await createWorkspaceWithProject(prisma, label);
  await withTenantContext(prisma, fixture.workspaceId, (tx) => createWorkspaceDek(tx, fixture.workspaceId));
  return fixture;
}
