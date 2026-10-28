import { AUTO_CREATED_SEVERITY, failedStepOf } from '../bugs/bug-rules';
import { BUGS, ENVIRONMENTS, EXECUTIONS, FOLDERS, MARKER_FOLDER_KEY, TEST_CASES } from './demo-dataset';

const STARTED = ['InProgress', 'Paused', 'Completed', 'Done'];
const testCase = (key: string) => TEST_CASES.find((t) => t.key === key)!;
const execution = (key: string) => EXECUTIONS.find((e) => e.key === key)!;

describe('demo dataset (specs/demo-seed)', () => {
  it('has unique keys within each kind', () => {
    const credentialKeys = ENVIRONMENTS.flatMap((e) => e.credentials.map((c) => c.key));
    for (const keys of [
      FOLDERS.map((f) => f.key),
      TEST_CASES.map((t) => t.key),
      ENVIRONMENTS.map((e) => e.key),
      credentialKeys,
      EXECUTIONS.map((e) => e.key),
      BUGS.map((b) => b.key),
    ]) {
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('nests folders at most 4 levels under the single marker root, with unique sibling names', () => {
    const level = (key: string): number => {
      const folder = FOLDERS.find((f) => f.key === key)!;
      return folder.parentKey === null ? 1 : 1 + level(folder.parentKey);
    };
    expect(FOLDERS.filter((f) => f.parentKey === null).map((f) => f.key)).toEqual([MARKER_FOLDER_KEY]);
    expect(Math.max(...FOLDERS.map((f) => level(f.key)))).toBe(4);
    const siblings = FOLDERS.map((f) => `${f.parentKey}/${f.name.toLowerCase()}`);
    expect(new Set(siblings).size).toBe(siblings.length);
    for (const t of TEST_CASES) {
      expect(FOLDERS.some((f) => f.key === t.folderKey)).toBe(true);
    }
  });

  it('has at least 25 test cases in all three statuses', () => {
    expect(TEST_CASES.length).toBeGreaterThanOrEqual(25);
    for (const status of ['Ready', 'Draft', 'Deprecated']) {
      expect(TEST_CASES.some((t) => t.status === status)).toBe(true);
    }
  });

  it('covers every execution status once, each run referencing a distinct Ready test case', () => {
    expect(EXECUTIONS.map((e) => e.status).sort()).toEqual(['Completed', 'Done', 'Draft', 'InProgress', 'Paused', 'Ready']);
    for (const e of EXECUTIONS) {
      const keys = e.runs.map((r) => r.testCaseKey);
      expect(new Set(keys).size).toBe(keys.length);
      for (const key of keys) {
        expect(testCase(key).status).toBe('Ready');
      }
    }
  });

  it('records outcomes only on started executions, consistent with each status', () => {
    for (const e of EXECUTIONS) {
      const outcomes = e.runs.map((r) => r.outcome ?? 'Pending');
      if (!STARTED.includes(e.status)) {
        expect(outcomes.every((o) => o === 'Pending')).toBe(true);
        expect(e.startedDaysAgo).toBeUndefined();
      } else {
        expect(e.startedDaysAgo).toBeDefined();
      }
    }
    const completed = execution('payments-smoke').runs.map((r) => r.outcome ?? 'Pending');
    expect(completed.filter((o) => o === 'NeedsReview')).toHaveLength(1);
    expect(completed).not.toContain('Pending');
    const done = execution('release-2-3').runs.map((r) => r.outcome ?? 'Pending');
    expect(done.some((o) => o === 'NeedsReview' || o === 'Pending')).toBe(false);
    for (const e of EXECUTIONS.filter((x) => x.status === 'InProgress' || x.status === 'Paused')) {
      expect(e.runs.some((r) => !r.outcome)).toBe(true);
    }
  });

  it('keeps lifecycle times in order', () => {
    for (const e of EXECUTIONS) {
      const times = [e.createdDaysAgo, e.readyDaysAgo, e.startedDaysAgo, e.pausedDaysAgo, e.completedDaysAgo, e.signedOffDaysAgo].filter(
        (t): t is number => t !== undefined,
      );
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    }
  });

  it('files run-linked bugs from Fail runs of started executions, with a real failed step', () => {
    for (const bug of BUGS.filter((b) => b.run)) {
      const e = execution(bug.run!.executionKey);
      expect(STARTED).toContain(e.status);
      expect(e.runs.find((r) => r.testCaseKey === bug.run!.testCaseKey)?.outcome).toBe('Fail');
      if (bug.failedStep !== null) {
        expect(failedStepOf(testCase(bug.run!.testCaseKey).gherkin, bug.failedStep)).toBe(bug.failedStep);
      }
      expect(bug.createdDaysAgo).toBeLessThanOrEqual(e.startedDaysAgo!);
    }
    expect(BUGS.filter((b) => b.run).length).toBeGreaterThan(BUGS.length / 2);
  });

  it('auto-creates exactly one bug per Fail run of an auto-create execution, as the API would', () => {
    for (const e of EXECUTIONS.filter((x) => x.autoCreateBug)) {
      for (const run of e.runs.filter((r) => r.outcome === 'Fail')) {
        const auto = BUGS.filter((b) => b.autoCreated && b.run?.executionKey === e.key && b.run.testCaseKey === run.testCaseKey);
        expect(auto).toHaveLength(1);
        expect(auto[0]).toMatchObject({ title: testCase(run.testCaseKey).name, failedStep: null });
      }
    }
    for (const bug of BUGS.filter((b) => b.autoCreated)) {
      expect(execution(bug.run!.executionKey).autoCreateBug).toBe(true);
      expect(bug.severity).toBe(AUTO_CREATED_SEVERITY);
    }
  });
});
