import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { withTenantContext } from '../../src/common/tenant-context';
import { insertTestUser, insertWorkspaceMembership, insertProjectMembership } from './membership-fixtures';

/** A project member with the given role; returns the Clerk id the mocked verifier accepts as a bearer token. */
export async function setUpProjectMember(
  prisma: PrismaClient,
  workspaceId: string,
  projectId: string,
  role: 'Admin' | 'Contributor' | 'Viewer' | null,
): Promise<string> {
  const clerkUserId = `clerk-exec-${(role ?? 'none').toLowerCase()}-${randomUUID()}`;
  const userId = await insertTestUser(prisma, clerkUserId, `${role ?? 'No Access'} User`);
  await insertWorkspaceMembership(prisma, workspaceId, userId, 'Collaborator');
  if (role !== null) {
    await insertProjectMembership(prisma, workspaceId, projectId, userId, role);
  }
  return clerkUserId;
}

/** Inserts test cases directly (no API), each with a script; Ready unless told otherwise. */
export async function insertTestCases(
  prisma: PrismaClient,
  workspaceId: string,
  projectId: string,
  names: string[],
  status: 'Draft' | 'Ready' | 'Deprecated' = 'Ready',
): Promise<string[]> {
  const ids: string[] = [];
  await withTenantContext(prisma, workspaceId, async (tx) => {
    for (const name of names) {
      const id = randomUUID();
      // position_key is required since folder-tree; zero-padded keeps insertion order.
      const positionKey = `${String(ids.length + 1).padStart(8, '0')}1`;
      await tx.$executeRaw`INSERT INTO test_case (id, project_id, workspace_id, name, gherkin_script, status, position_key)
        VALUES (${id}::uuid, ${projectId}::uuid, ${workspaceId}::uuid, ${name}, ${`Given ${name}`}, ${status}, ${positionKey})`;
      ids.push(id);
    }
  });
  return ids;
}

export async function insertEnvironment(
  prisma: PrismaClient,
  workspaceId: string,
  projectId: string,
  name: string,
): Promise<string> {
  const id = randomUUID();
  await withTenantContext(prisma, workspaceId, (tx) =>
    tx.$executeRaw`INSERT INTO environment (id, project_id, workspace_id, name, base_url, default_browser)
      VALUES (${id}::uuid, ${projectId}::uuid, ${workspaceId}::uuid, ${name}, 'https://staging.example.com', 'WebKit')`,
  );
  return id;
}

export async function activityCodesFor(prisma: PrismaClient, workspaceId: string, entityId: string): Promise<string[]> {
  const rows = await withTenantContext(prisma, workspaceId, (tx) =>
    tx.$queryRaw<{ action_code: string }[]>`
      SELECT action_code FROM activity_entries WHERE entity_id = ${entityId}::uuid ORDER BY created_at ASC`,
  );
  return rows.map((row) => row.action_code);
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
