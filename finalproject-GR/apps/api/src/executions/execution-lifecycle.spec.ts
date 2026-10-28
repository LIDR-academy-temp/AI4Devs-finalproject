import {
  canTransition,
  completesExecution,
  elapsedMs,
  type ExecutionStatus,
  type LifecycleAction,
  TRANSITIONS,
} from './execution-lifecycle';

const ALL_STATUSES: ExecutionStatus[] = ['Draft', 'Ready', 'InProgress', 'Paused', 'Completed', 'Done', 'Canceled'];

describe('execution lifecycle', () => {
  it.each<[LifecycleAction, ExecutionStatus, ExecutionStatus]>([
    ['markReady', 'Draft', 'Ready'],
    ['backToDraft', 'Ready', 'Draft'],
    ['runAll', 'Ready', 'InProgress'],
    ['pause', 'InProgress', 'Paused'],
    ['resume', 'Paused', 'InProgress'],
    ['signOff', 'Completed', 'Done'],
  ])('%s moves %s to %s', (action, from, to) => {
    expect(canTransition(action, from)).toBe(true);
    expect(TRANSITIONS[action].to).toBe(to);
  });

  it('allows each action from exactly one status', () => {
    for (const action of Object.keys(TRANSITIONS) as LifecycleAction[]) {
      const allowedFrom = ALL_STATUSES.filter((status) => canTransition(action, status));
      expect(allowedFrom).toEqual([TRANSITIONS[action].from]);
    }
  });

  it.each<[LifecycleAction, ExecutionStatus]>([
    ['pause', 'Ready'],
    ['runAll', 'Draft'],
    ['resume', 'InProgress'],
    ['signOff', 'InProgress'],
    ['markReady', 'Done'],
    ['backToDraft', 'Canceled'],
  ])('refuses %s from %s', (action, from) => {
    expect(canTransition(action, from)).toBe(false);
  });

  it('only Sign Off needs Admin', () => {
    const adminOnly = (Object.keys(TRANSITIONS) as LifecycleAction[]).filter((a) => TRANSITIONS[a].minRole === 'Admin');
    expect(adminOnly).toEqual(['signOff']);
  });

  it('completes only an InProgress execution with no Pending runs left', () => {
    expect(completesExecution('InProgress', 0)).toBe(true);
    expect(completesExecution('InProgress', 1)).toBe(false);
    expect(completesExecution('Completed', 0)).toBe(false);
  });

  describe('elapsedMs', () => {
    const start = new Date('2026-10-25T10:00:00Z');

    it('counts the running period on top of the accumulator', () => {
      expect(elapsedMs(5_000, start, new Date('2026-10-25T10:00:03Z'))).toBe(8_000);
    });

    it('stays fixed while paused', () => {
      expect(elapsedMs(8_000, null, new Date('2026-10-25T11:00:00Z'))).toBe(8_000);
    });

    it('excludes paused time across pause and resume', () => {
      // Run 3s, pause for an hour, resume and run 2s more.
      const afterFirstPeriod = elapsedMs(0, start, new Date('2026-10-25T10:00:03Z'));
      const resumedAt = new Date('2026-10-25T11:00:03Z');
      expect(elapsedMs(afterFirstPeriod, resumedAt, new Date('2026-10-25T11:00:05Z'))).toBe(5_000);
    });

    it('never goes negative on clock skew', () => {
      expect(elapsedMs(1_000, start, new Date('2026-10-25T09:59:00Z'))).toBe(1_000);
    });
  });
});
