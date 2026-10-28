import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject, type WorkspaceFixture } from './helpers/cross-tenant-harness';
import { activityCodesFor, setUpProjectMember } from './helpers/execution-fixtures';
import { withTenantContext } from '../src/common/tenant-context';
import { insertTestUser } from './helpers/membership-fixtures';

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

interface Setup extends WorkspaceFixture {
  contributor: string;
  admin: string;
  viewer: string;
}

interface TagBody {
  id: string;
  name: string;
  color: string;
  testCaseCount: number;
  bugCount: number;
}

describe('tags (e2e, specs/tag-management)', () => {
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

  const api = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const tags = (s: Setup) => `/projects/${s.projectId}/tags`;

  async function setUp(label: string): Promise<Setup> {
    const f = await createWorkspaceWithProject(prisma, `${label}-${randomUUID().slice(0, 8)}`);
    return {
      ...f,
      contributor: await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Contributor'),
      admin: await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Admin'),
      viewer: await setUpProjectMember(prisma, f.workspaceId, f.projectId, 'Viewer'),
    };
  }

  async function createTag(s: Setup, body: Record<string, unknown>): Promise<TagBody> {
    const response = await api().post(tags(s)).set(as(s.contributor)).send(body);
    expect(response.status).toBe(201);
    return response.body;
  }

  /** Inserts test cases carrying `tagId` directly; `deleted` ones are soft-deleted. */
  async function tagTestCases(s: Setup, tagId: string, count: number, deleted = 0): Promise<string[]> {
    return withTenantContext(prisma, s.workspaceId, async (tx) => {
      const ids: string[] = [];
      for (let i = 0; i < count + deleted; i++) {
        const id = randomUUID();
        ids.push(id);
        await tx.$executeRaw`INSERT INTO test_case (id, project_id, workspace_id, name, position_key, deleted_at)
          VALUES (${id}::uuid, ${s.projectId}::uuid, ${s.workspaceId}::uuid, ${`Case ${i}`}, ${`k${i}`}, ${i >= count ? new Date() : null}::timestamptz)`;
        await tx.$executeRaw`INSERT INTO test_case_tag (test_case_id, tag_id, workspace_id)
          VALUES (${id}::uuid, ${tagId}::uuid, ${s.workspaceId}::uuid)`;
      }
      return ids;
    });
  }

  /** Inserts bugs carrying `tagId` directly; `deleted` ones are soft-deleted. */
  async function tagBugs(s: Setup, tagId: string, count: number, deleted = 0): Promise<string[]> {
    const reporterId = await insertTestUser(prisma, `clerk-tags-reporter-${randomUUID()}`, 'Reporter');
    return withTenantContext(prisma, s.workspaceId, async (tx) => {
      const ids: string[] = [];
      for (let i = 0; i < count + deleted; i++) {
        const id = randomUUID();
        ids.push(id);
        await tx.$executeRaw`INSERT INTO bug (id, project_id, workspace_id, title, severity, reporter_id, reporter_display_name, deleted_at)
          VALUES (${id}::uuid, ${s.projectId}::uuid, ${s.workspaceId}::uuid, ${`Bug ${i}`}, 'Low', ${reporterId}::uuid, 'Reporter',
                  ${i >= count ? new Date() : null}::timestamptz)`;
        await tx.$executeRaw`INSERT INTO bug_tag (bug_id, tag_id, workspace_id) VALUES (${id}::uuid, ${tagId}::uuid, ${s.workspaceId}::uuid)`;
      }
      return ids;
    });
  }

  it('a Viewer lists tags by name, with counts that ignore deleted test cases and bugs', async () => {
    const s = await setUp('Tags-List');
    const smoke = await createTag(s, { name: 'smoke' });
    await createTag(s, { name: 'Regression' });
    await tagTestCases(s, smoke.id, 2, 1);
    await tagBugs(s, smoke.id, 1, 1);

    const response = await api().get(tags(s)).set(as(s.viewer));

    expect(response.status).toBe(200);
    expect((response.body as TagBody[]).map((t) => [t.name, t.testCaseCount, t.bugCount])).toEqual([
      ['Regression', 0, 0],
      ['smoke', 2, 1],
    ]);
  });

  it('creating trims the name, rotates default colours, and logs the creation', async () => {
    const s = await setUp('Tags-Create');

    const first = await createTag(s, { name: '  Smoke ' });
    const second = await createTag(s, { name: 'Checkout' });
    const chosen = await createTag(s, { name: 'Payments', color: 'teal' });

    expect([first.name, first.color, second.color, chosen.color]).toEqual(['Smoke', 'gray', 'red', 'teal']);
    expect(await activityCodesFor(prisma, s.workspaceId, first.id)).toEqual(['tag.created']);
  });

  it('a duplicate name ignoring case is refused with 409', async () => {
    const s = await setUp('Tags-Dup');
    await createTag(s, { name: 'Smoke' });

    const response = await api().post(tags(s)).set(as(s.contributor)).send({ name: 'smoke' });

    expect(response.status).toBe(409);
    expect(((await api().get(tags(s)).set(as(s.viewer))).body as TagBody[]).length).toBe(1);
  });

  it('invalid names and colours are refused with 400', async () => {
    const s = await setUp('Tags-Invalid');
    for (const body of [{ name: '  ' }, { name: 'x'.repeat(51) }, { name: 'ok', color: 'pink' }]) {
      expect((await api().post(tags(s)).set(as(s.contributor)).send(body)).status).toBe(400);
    }
  });

  it('renaming and recolouring log from/to; a no-op update logs nothing', async () => {
    const s = await setUp('Tags-Update');
    const tag = await createTag(s, { name: 'Smoke', color: 'gray' });

    const renamed = await api().patch(`${tags(s)}/${tag.id}`).set(as(s.contributor)).send({ name: 'Smoke suite', color: 'blue' });
    const noop = await api().patch(`${tags(s)}/${tag.id}`).set(as(s.contributor)).send({ name: 'Smoke suite' });

    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ name: 'Smoke suite', color: 'blue' });
    expect(noop.status).toBe(200);
    const entries = await withTenantContext(prisma, s.workspaceId, (tx) =>
      tx.$queryRaw<{ action_code: string; details: unknown }[]>`
        SELECT action_code, details FROM activity_entries WHERE entity_id = ${tag.id}::uuid ORDER BY created_at`,
    );
    expect(entries.map((e) => e.action_code)).toEqual(['tag.created', 'tag.updated']);
    expect(entries[1].details).toEqual({
      changes: { name: { from: 'Smoke', to: 'Smoke suite' }, color: { from: 'gray', to: 'blue' } },
    });
  });

  it('renaming to an existing name is refused with 409', async () => {
    const s = await setUp('Tags-RenameDup');
    await createTag(s, { name: 'Smoke' });
    const other = await createTag(s, { name: 'Other' });

    const response = await api().patch(`${tags(s)}/${other.id}`).set(as(s.contributor)).send({ name: 'SMOKE' });

    expect(response.status).toBe(409);
  });

  it('a Viewer cannot create and a Contributor cannot delete', async () => {
    const s = await setUp('Tags-Roles');
    const tag = await createTag(s, { name: 'Smoke' });

    expect((await api().post(tags(s)).set(as(s.viewer)).send({ name: 'x' })).status).toBe(403);
    expect((await api().delete(`${tags(s)}/${tag.id}`).set(as(s.contributor))).status).toBe(403);
  });

  it('an Admin deletes a tag permanently, removing it from its test cases and bugs, and logs the reach', async () => {
    const s = await setUp('Tags-Delete');
    const tag = await createTag(s, { name: 'legacy' });
    const carriers = await tagTestCases(s, tag.id, 2);
    const bugCarriers = await tagBugs(s, tag.id, 1);

    const response = await api().delete(`${tags(s)}/${tag.id}`).set(as(s.admin));

    expect(response.status).toBe(204);
    const left = await withTenantContext(prisma, s.workspaceId, (tx) =>
      tx.$queryRaw<{ n: bigint }[]>`
        SELECT (SELECT COUNT(*) FROM tag WHERE id = ${tag.id}::uuid)
             + (SELECT COUNT(*) FROM test_case_tag WHERE test_case_id = ANY(${carriers}::uuid[]))
             + (SELECT COUNT(*) FROM bug_tag WHERE bug_id = ANY(${bugCarriers}::uuid[])) AS n`,
    );
    expect(Number(left[0].n)).toBe(0);
    const [entry] = await withTenantContext(prisma, s.workspaceId, (tx) =>
      tx.$queryRaw<{ details: unknown }[]>`
        SELECT details FROM activity_entries WHERE entity_id = ${tag.id}::uuid AND action_code = 'tag.deleted'`,
    );
    expect(entry.details).toEqual({ testCases: 2, bugs: 1 });
  });

  it("another workspace's tag is not found and never listed", async () => {
    const a = await setUp('Tags-TenantA');
    const b = await setUp('Tags-TenantB');
    const foreign = await createTag(b, { name: 'Foreign' });

    expect((await api().patch(`${tags(a)}/${foreign.id}`).set(as(a.contributor)).send({ name: 'Mine' })).status).toBe(404);
    expect((await api().delete(`${tags(a)}/${foreign.id}`).set(as(a.admin))).status).toBe(404);
    expect((await api().get(tags(a)).set(as(a.viewer))).body).toEqual([]);
  });
});
