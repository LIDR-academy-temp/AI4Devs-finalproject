import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../common/prisma.service';
import { withTenantContext } from '../common/tenant-context';
import { encrypt } from '../common/secrets-encryption';
import { keyBetween } from '../common/ordering';
import { resolveSeedTarget, type SeedTarget } from '../common/seed-target';
import {
  BUGS,
  ENVIRONMENTS,
  EXECUTIONS,
  FOLDERS,
  MARKER_FOLDER_KEY,
  TEAMMATES,
  TEST_CASES,
  type Actor,
  type DemoExecution,
  type RunOutcome,
} from './demo-dataset';

/** The project already has something the seed would collide with. */
export { SeedTargetError } from '../common/seed-target';
export type { SeedTarget } from '../common/seed-target';

export class SeedConflictError extends Error {}

/**
 * Deterministic UUID derived from a key, so every seeded row has a stable id per
 * workspace and a rerun can recognise its own data (design.md decision 3).
 */
export function seedUuid(key: string): string {
  const bytes = Buffer.from(createHash('sha256').update(key).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export interface SeedCounts {
  teammates: number;
  folders: number;
  testCases: number;
  environments: number;
  credentials: number;
  executions: number;
  runs: number;
  bugs: number;
  activityEntries: number;
}

export interface SeedResult {
  status: 'seeded' | 'already-present';
  target: SeedTarget;
  counts?: SeedCounts;
}

type Column = [name: string, cast?: string];
type Row = unknown[];

/** One multi-row INSERT per table keeps the whole seed well inside the transaction timeout. */
async function insertRows(tx: Prisma.TransactionClient, table: string, columns: Column[], rows: Row[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const values = rows.map(
    (row) =>
      Prisma.sql`(${Prisma.join(
        row.map((value, i) => {
          const cast = columns[i][1];
          return cast ? Prisma.sql`${value}::${Prisma.raw(cast)}` : Prisma.sql`${value}`;
        }),
      )})`,
  );
  await tx.$executeRaw`INSERT INTO ${Prisma.raw(table)} (${Prisma.raw(columns.map((c) => c[0]).join(', '))}) VALUES ${Prisma.join(values)}`;
}

interface ActivityRow {
  key: string;
  actor: Actor;
  actionCode: string;
  entityType: string;
  entityId: string;
  entityName: string;
  category: string;
  details: Record<string, unknown> | null;
  at: Date;
}

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/** `count` instants spread evenly over [start, end], the last one at `end`. */
function spread(start: Date, end: Date, count: number): Date[] {
  const step = (end.getTime() - start.getTime()) / Math.max(count, 1);
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + step * (i + 1)));
}

/** When each recorded outcome of a started execution was set (consistent with its timer). */
function outcomeTimes(execution: DemoExecution, recorded: number, at: (daysAgo: number) => Date, now: Date): Date[] {
  const started = at(execution.startedDaysAgo!);
  if (execution.status === 'InProgress') {
    // One finished period of `elapsedMinutes`, then the current one since `resumedMinutesAgo`.
    const firstEnd = new Date(started.getTime() + execution.elapsedMinutes * MINUTE_MS);
    const resumed = new Date(now.getTime() - execution.resumedMinutesAgo! * MINUTE_MS);
    const firstCount = Math.ceil(recorded / 2);
    return [...spread(started, firstEnd, firstCount), ...spread(resumed, new Date(now.getTime() - 2 * MINUTE_MS), recorded - firstCount)];
  }
  const end =
    execution.status === 'Paused'
      ? new Date(at(execution.pausedDaysAgo!).getTime() - MINUTE_MS)
      : at(execution.completedDaysAgo!);
  return spread(started, end, recorded);
}

/**
 * Fills the target user's default project with the ShopFlow demo dataset
 * (specs/demo-seed). Additive and idempotent: a rerun finds the marker folder and
 * writes nothing; everything else is one transaction.
 */
export async function seedDemo(
  prisma: PrismaService,
  clerkUserId: string,
  options: { now?: Date } = {},
): Promise<SeedResult> {
  const target = await resolveSeedTarget(prisma, clerkUserId);
  const { workspaceId, projectId } = target;
  const id = (key: string) => seedUuid(`${workspaceId}:${key}`);
  const markerId = id(`folder:${MARKER_FOLDER_KEY}`);

  const markerPresent = async (tx: Prisma.TransactionClient) =>
    (await tx.$queryRaw<{ id: string }[]>`SELECT id FROM folder WHERE id = ${markerId}::uuid`).length > 0;
  if (await withTenantContext(prisma, workspaceId, markerPresent)) {
    return { status: 'already-present', target };
  }

  const now = options.now ?? new Date();
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS);

  // encrypt() reads the workspace DEK in its own transaction, so it runs first (decision 4).
  const ciphertexts = new Map<string, string>();
  for (const credential of ENVIRONMENTS.flatMap((e) => e.credentials)) {
    const credentialId = id(`credential:${credential.key}`);
    ciphertexts.set(credential.key, await encrypt(prisma, workspaceId, credentialId, credential.password));
  }

  const people: Record<Actor, { id: string; name: string }> = {
    owner: { id: target.userId, name: target.displayName },
    contributor: { id: id('user:contributor'), name: TEAMMATES.find((t) => t.key === 'contributor')!.displayName },
  };
  const testCaseByKey = new Map(TEST_CASES.map((t) => [t.key, t]));
  const activity: ActivityRow[] = [];

  return withTenantContext(prisma, workspaceId, async (tx) => {
    if (await markerPresent(tx)) {
      return { status: 'already-present', target };
    }
    const markerName = FOLDERS.find((f) => f.key === MARKER_FOLDER_KEY)!.name;
    const clash = await tx.$queryRaw<{ name: string }[]>`
      SELECT name FROM folder
      WHERE project_id = ${projectId}::uuid AND parent_folder_id IS NULL AND deleted_at IS NULL
        AND lower(name) = lower(${markerName})
    `;
    if (clash.length > 0) {
      throw new SeedConflictError(`The project already has a root folder named "${clash[0].name}"; rename it, then seed again`);
    }

    // Teammates: "user" rows need app.user_id = their own id (WITH CHECK), as in provisionIdentity.
    for (const teammate of TEAMMATES) {
      const userId = id(`user:${teammate.key}`);
      await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
      await tx.$executeRaw`
        INSERT INTO "user" (id, clerk_user_id, display_name, email, created_at)
        VALUES (${userId}::uuid, ${`seed:${workspaceId}:${teammate.key}`}, ${teammate.displayName}, ${teammate.email}, ${at(21)}::timestamptz)
      `;
    }
    await tx.$executeRaw`SELECT set_config('app.user_id', ${target.userId}, true)`;
    await insertRows(
      tx,
      'workspace_membership',
      [['id', 'uuid'], ['workspace_id', 'uuid'], ['user_id', 'uuid'], ['role'], ['created_at', 'timestamptz']],
      TEAMMATES.map((t) => [id(`workspace_membership:${t.key}`), workspaceId, id(`user:${t.key}`), 'Collaborator', at(21)]),
    );
    await insertRows(
      tx,
      'project_membership',
      [['id', 'uuid'], ['project_id', 'uuid'], ['workspace_id', 'uuid'], ['user_id', 'uuid'], ['role'], ['created_at', 'timestamptz']],
      TEAMMATES.map((t) => [id(`project_membership:${t.key}`), projectId, workspaceId, id(`user:${t.key}`), t.projectRole, at(21)]),
    );

    // Folders: the marker root goes after the project's last root folder (decision 5).
    const [lastRoot] = await tx.$queryRaw<{ position_key: string }[]>`
      SELECT position_key FROM folder
      WHERE project_id = ${projectId}::uuid AND parent_folder_id IS NULL AND deleted_at IS NULL
      ORDER BY position_key DESC, id DESC LIMIT 1
    `;
    const lastKey = new Map<string, string | null>([['__root__', lastRoot?.position_key ?? null]]);
    const nextKey = (space: string) => {
      const key = keyBetween(lastKey.get(space) ?? null, null);
      lastKey.set(space, key);
      return key;
    };
    await insertRows(
      tx,
      'folder',
      [
        ['id', 'uuid'], ['project_id', 'uuid'], ['workspace_id', 'uuid'], ['parent_folder_id', 'uuid'], ['name'],
        ['position_key'], ['created_at', 'timestamptz'], ['updated_at', 'timestamptz'],
      ],
      FOLDERS.map((f) => {
        const folderId = id(`folder:${f.key}`);
        const parentId = f.parentKey ? id(`folder:${f.parentKey}`) : null;
        activity.push({
          key: `folder:${f.key}:created`, actor: 'owner', actionCode: 'folder.created', entityType: 'folder',
          entityId: folderId, entityName: f.name, category: 'Test Cases', details: { parentFolderId: parentId }, at: at(f.createdDaysAgo),
        });
        return [folderId, projectId, workspaceId, parentId, f.name, nextKey(f.parentKey ? `folder:${f.parentKey}` : '__root__'), at(f.createdDaysAgo), at(f.createdDaysAgo)];
      }),
    );
    // Test case creation isn't logged by the API, so it isn't here either (design.md).
    await insertRows(
      tx,
      'test_case',
      [
        ['id', 'uuid'], ['project_id', 'uuid'], ['workspace_id', 'uuid'], ['name'], ['gherkin_script'], ['status'],
        ['folder_id', 'uuid'], ['position_key'], ['created_at', 'timestamptz'],
      ],
      TEST_CASES.map((t) => [
        id(`test_case:${t.key}`), projectId, workspaceId, t.name, t.gherkin, t.status,
        id(`folder:${t.folderKey}`), nextKey(`cases:${t.folderKey}`), at(t.createdDaysAgo),
      ]),
    );

    await insertRows(
      tx,
      'environment',
      [['id', 'uuid'], ['project_id', 'uuid'], ['workspace_id', 'uuid'], ['name'], ['base_url'], ['default_browser'], ['created_at', 'timestamptz']],
      ENVIRONMENTS.map((e) => [id(`environment:${e.key}`), projectId, workspaceId, e.name, e.baseUrl, e.defaultBrowser, at(e.createdDaysAgo)]),
    );
    await insertRows(
      tx,
      'environment_credential',
      [['id', 'uuid'], ['environment_id', 'uuid'], ['workspace_id', 'uuid'], ['alias'], ['email'], ['password_ciphertext'], ['created_at', 'timestamptz']],
      ENVIRONMENTS.flatMap((e) =>
        e.credentials.map((c) => [
          id(`credential:${c.key}`), id(`environment:${e.key}`), workspaceId, c.alias, c.email, ciphertexts.get(c.key), at(e.createdDaysAgo),
        ]),
      ),
    );

    // Executions and runs, with every lifecycle step the API would have logged.
    const executionRows: Row[] = [];
    const runRows: Row[] = [];
    const runInfo = new Map<string, { runId: string; outcomeAt: Date | null; by: Actor; name: string; gherkin: string }>();
    for (const e of EXECUTIONS) {
      const executionId = id(`execution:${e.key}`);
      const environment = ENVIRONMENTS.find((env) => env.key === e.environmentKey) ?? null;
      const started = e.startedDaysAgo !== undefined;
      const log = (step: string, actor: Actor, actionCode: string, when: Date, details: Record<string, unknown> | null) =>
        activity.push({
          key: `execution:${e.key}:${step}`, actor, actionCode, entityType: 'test_execution',
          entityId: executionId, entityName: e.name, category: 'Executions', details, at: when,
        });

      log('created', e.createdBy, 'test_execution.created', at(e.createdDaysAgo), null);
      if (e.readyDaysAgo !== undefined) {
        log('ready', e.createdBy, 'test_execution.marked_ready', at(e.readyDaysAgo), { from: 'Draft', to: 'Ready' });
      }
      if (started) {
        log('started', e.createdBy, 'test_execution.started', at(e.startedDaysAgo!), { from: 'Ready', to: 'InProgress' });
      }

      const recorded = e.runs.filter((r) => r.outcome);
      const times = started ? outcomeTimes(e, recorded.length, at, now) : [];
      let lastEvent = at(e.readyDaysAgo ?? e.createdDaysAgo);
      let lastRecorder: Actor = e.createdBy;
      e.runs.forEach((run, index) => {
        const testCase = testCaseByKey.get(run.testCaseKey)!;
        const runId = id(`run:${e.key}:${run.testCaseKey}`);
        const outcome: RunOutcome = run.outcome ?? 'Pending';
        const by: Actor = run.by ?? 'contributor';
        const outcomeAt = run.outcome ? times[recorded.indexOf(run)] : null;
        if (outcomeAt) {
          lastEvent = outcomeAt;
          lastRecorder = by;
          activity.push({
            key: `run:${e.key}:${run.testCaseKey}:outcome`, actor: by, actionCode: 'test_run.outcome_set', entityType: 'test_run',
            entityId: runId, entityName: testCase.name, category: 'Executions', details: { executionId, from: 'Pending', to: outcome }, at: outcomeAt,
          });
        }
        runInfo.set(`${e.key}:${run.testCaseKey}`, { runId, outcomeAt, by, name: testCase.name, gherkin: testCase.gherkin });
        runRows.push([
          runId, executionId, workspaceId, id(`test_case:${run.testCaseKey}`), index + 1, outcome,
          started ? testCase.name : null, started ? testCase.gherkin : null,
          outcomeAt, outcomeAt ? people[by].id : null, at(e.createdDaysAgo),
        ]);
      });

      let lastResumedAt: Date | null = null;
      if (e.status === 'InProgress') {
        const pausedAt = new Date(at(e.startedDaysAgo!).getTime() + e.elapsedMinutes * MINUTE_MS);
        lastResumedAt = new Date(now.getTime() - e.resumedMinutesAgo! * MINUTE_MS);
        log('paused', 'contributor', 'test_execution.paused', pausedAt, { from: 'InProgress', to: 'Paused' });
        log('resumed', 'contributor', 'test_execution.resumed', lastResumedAt, { from: 'Paused', to: 'InProgress' });
      }
      if (e.status === 'Paused') {
        lastEvent = at(e.pausedDaysAgo!);
        log('paused', 'contributor', 'test_execution.paused', lastEvent, { from: 'InProgress', to: 'Paused' });
      }
      const completedAt = e.completedDaysAgo !== undefined ? at(e.completedDaysAgo) : null;
      if (completedAt) {
        log('completed', lastRecorder, 'test_execution.completed', completedAt, { from: 'InProgress', to: 'Completed' });
      }
      const signedOffAt = e.signedOffDaysAgo !== undefined ? at(e.signedOffDaysAgo) : null;
      if (signedOffAt) {
        lastEvent = signedOffAt;
        log('signed-off', 'owner', 'test_execution.signed_off', signedOffAt, { from: 'Completed', to: 'Done' });
      }

      executionRows.push([
        executionId, projectId, workspaceId, e.name, e.description, e.status,
        environment ? id(`environment:${environment.key}`) : null, environment?.name ?? null,
        e.browser, e.viewport[0], e.viewport[1], e.locale, e.timezone, e.autoCreateBug,
        e.elapsedMinutes * MINUTE_MS, lastResumedAt, started ? at(e.startedDaysAgo!) : null, completedAt,
        signedOffAt, signedOffAt ? people.owner.id : null, people[e.createdBy].id,
        at(e.createdDaysAgo), lastResumedAt && lastResumedAt > lastEvent ? lastResumedAt : lastEvent,
      ]);
    }
    await insertRows(
      tx,
      'test_execution',
      [
        ['id', 'uuid'], ['project_id', 'uuid'], ['workspace_id', 'uuid'], ['name'], ['description'], ['status'],
        ['environment_id', 'uuid'], ['environment_name'], ['browser'], ['viewport_width', 'integer'], ['viewport_height', 'integer'],
        ['locale'], ['timezone'], ['auto_create_bug', 'boolean'], ['elapsed_ms_accumulated', 'bigint'],
        ['last_resumed_at', 'timestamptz'], ['started_at', 'timestamptz'], ['completed_at', 'timestamptz'],
        ['signed_off_at', 'timestamptz'], ['signed_off_by', 'uuid'], ['created_by', 'uuid'],
        ['created_at', 'timestamptz'], ['updated_at', 'timestamptz'],
      ],
      executionRows,
    );
    await insertRows(
      tx,
      'test_run',
      [
        ['id', 'uuid'], ['execution_id', 'uuid'], ['workspace_id', 'uuid'], ['test_case_id', 'uuid'], ['position', 'integer'],
        ['outcome'], ['test_case_name_snapshot'], ['gherkin_script_snapshot'], ['outcome_updated_at', 'timestamptz'],
        ['outcome_updated_by', 'uuid'], ['created_at', 'timestamptz'],
      ],
      runRows,
    );

    // Bugs: run-linked ones copy the run's snapshots (ADR 0013) and come after its outcome.
    const bugRows = BUGS.map((b) => {
      const bugId = id(`bug:${b.key}`);
      const run = b.run ? runInfo.get(`${b.run.executionKey}:${b.run.testCaseKey}`)! : null;
      let createdAt = at(b.createdDaysAgo);
      if (run?.outcomeAt) {
        // An auto-created bug is written in the same transaction as the Fail outcome.
        const earliest = b.autoCreated ? run.outcomeAt : new Date(run.outcomeAt.getTime() + 2 * MINUTE_MS);
        if (b.autoCreated || createdAt < earliest) createdAt = earliest;
      }
      const reporter = b.autoCreated && run ? run.by : b.reporter;
      const createdDetails = b.autoCreated ? { auto: true, testRunId: run!.runId } : run ? { testRunId: run.runId } : null;
      activity.push({
        key: `bug:${b.key}:created`, actor: reporter, actionCode: 'bug.created', entityType: 'bug',
        entityId: bugId, entityName: b.title, category: 'Bugs', details: createdDetails, at: createdAt,
      });
      let updatedAt = createdAt;
      if (b.statusChange) {
        updatedAt = at(b.statusChange.daysAgo);
        activity.push({
          key: `bug:${b.key}:status`, actor: b.statusChange.by, actionCode: 'bug.updated', entityType: 'bug', entityId: bugId,
          entityName: b.title, category: 'Bugs', details: { changes: { status: { from: b.statusChange.from, to: b.status } } }, at: updatedAt,
        });
      }
      return [
        bugId, projectId, workspaceId, b.title, b.severity, b.status, b.description, b.stepsToReproduce,
        run?.runId ?? null, b.run ? id(`test_case:${b.run.testCaseKey}`) : null, run?.name ?? null, run?.gherkin ?? null,
        b.failedStep, people[reporter].id, people[reporter].name, b.autoCreated, createdAt, updatedAt,
      ];
    });
    await insertRows(
      tx,
      'bug',
      [
        ['id', 'uuid'], ['project_id', 'uuid'], ['workspace_id', 'uuid'], ['title'], ['severity'], ['status'], ['description'],
        ['steps_to_reproduce'], ['test_run_id', 'uuid'], ['test_case_id', 'uuid'], ['test_case_name_snapshot'], ['gherkin_snapshot'],
        ['failed_step_snapshot'], ['reporter_id', 'uuid'], ['reporter_display_name'], ['auto_created', 'boolean'],
        ['created_at', 'timestamptz'], ['updated_at', 'timestamptz'],
      ],
      bugRows,
    );

    // Activity is inserted directly: log() always stamps now(), and history must be backdated.
    await insertRows(
      tx,
      'activity_entries',
      [
        ['id', 'uuid'], ['workspace_id', 'uuid'], ['project_id', 'uuid'], ['actor_user_id', 'uuid'], ['actor_display_name'],
        ['action_code'], ['entity_type'], ['entity_id', 'uuid'], ['entity_name'], ['category'], ['details', 'jsonb'], ['created_at', 'timestamptz'],
      ],
      activity.map((a) => [
        id(`activity:${a.key}`), workspaceId, projectId, people[a.actor].id, people[a.actor].name, a.actionCode, a.entityType,
        a.entityId, a.entityName, a.category, a.details ? JSON.stringify(a.details) : null, a.at,
      ]),
    );

    return {
      status: 'seeded',
      target,
      counts: {
        teammates: TEAMMATES.length,
        folders: FOLDERS.length,
        testCases: TEST_CASES.length,
        environments: ENVIRONMENTS.length,
        credentials: ciphertexts.size,
        executions: EXECUTIONS.length,
        runs: runRows.length,
        bugs: bugRows.length,
        activityEntries: activity.length,
      },
    };
  });
}
