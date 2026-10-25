import { log, ActivityLogEntry } from './activity-logger';

describe('ActivityLogger.log', () => {
  it('inserts using the given tx and carries every field, opening no transaction itself', async () => {
    const fakeTx = {
      $executeRaw: jest.fn(async (..._args: unknown[]) => undefined),
      $transaction: jest.fn(),
    };

    const entry: ActivityLogEntry = {
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      actorUserId: 'user-1',
      actorDisplayName: 'Ada Lovelace',
      actionCode: 'project.created',
      entityType: 'project',
      entityId: 'project-1',
      entityName: 'Acme Web App',
      category: 'Projects',
      details: { foo: 'bar' },
    };

    await log(fakeTx as never, entry);

    expect(fakeTx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(fakeTx.$transaction).not.toHaveBeenCalled();

    // Values interpolated into the tagged template follow the strings array (args[0]).
    const values = fakeTx.$executeRaw.mock.calls[0].slice(1);
    expect(values).toEqual(
      expect.arrayContaining([
        entry.workspaceId,
        entry.projectId,
        entry.actorUserId,
        entry.actorDisplayName,
        entry.actionCode,
        entry.entityType,
        entry.entityId,
        entry.entityName,
        entry.category,
        JSON.stringify(entry.details),
      ]),
    );
  });

  it('writes nulls for a system action with no actor', async () => {
    const fakeTx = {
      $executeRaw: jest.fn(async (..._args: unknown[]) => undefined),
    };

    const entry: ActivityLogEntry = {
      workspaceId: 'workspace-1',
      actionCode: 'trash.purged',
      entityType: 'project',
      entityId: 'project-1',
      entityName: 'Acme Web App',
      category: 'Projects',
    };

    await log(fakeTx as never, entry);

    const values = fakeTx.$executeRaw.mock.calls[0].slice(1);
    expect(values).toEqual(expect.arrayContaining([null, null, null, null]));
  });
});
