import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ExecutionDetail } from './execution-detail';
import { ExecutionHeader } from './execution-header';
import { getExecution, moveRun, setRunOutcome, transitionExecution } from '../../lib/executions-api';
import { ApiError } from '../../lib/api-client';
import { renderWithProviders } from '../../test/render-with-providers';
import { makeExecution, makeExecutionWithRuns, makeRun } from '../../test/execution-fixtures';
import { keyboardDrag, mockSortableLayout } from '../../test/keyboard-drag';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/executions-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/executions-api')>()),
  getExecution: vi.fn(),
  transitionExecution: vi.fn(),
  setRunOutcome: vi.fn(),
  deleteExecution: vi.fn(),
  moveRun: vi.fn(),
}));

const mockedGet = vi.mocked(getExecution);
const mockedTransition = vi.mocked(transitionExecution);
const mockedSetOutcome = vi.mocked(setRunOutcome);

const runs = [
  makeRun({ id: 'r1', position: 1, testCaseName: 'Login', outcome: 'Pass' }),
  makeRun({ id: 'r2', position: 2, testCaseName: 'Checkout', outcome: 'Fail' }),
  makeRun({ id: 'r3', position: 3, testCaseName: 'Logout', outcome: 'Pending', testCaseDeleted: true }),
];

function renderDetail(role: 'Viewer' | 'Contributor' | 'Admin') {
  return renderWithProviders(<ExecutionDetail projectId="p1" executionId="exec-1" role={role} onDeleted={() => {}} />);
}

describe('ExecutionDetail', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedTransition.mockReset();
    mockedSetOutcome.mockReset();
  });

  it('shows run conditions, runs in order, and marks a deleted test case', async () => {
    mockedGet.mockResolvedValue(makeExecutionWithRuns(runs, { status: 'InProgress', browser: 'Firefox', locale: 'pt-BR' }));
    renderDetail('Viewer');

    expect(await screen.findByText('Firefox')).toBeTruthy();
    expect(screen.getByText('pt-BR')).toBeTruthy();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[1].textContent)).toEqual([
      'Login',
      'Checkout',
      'Logout(deleted test case)',
    ]);
  });

  it('the Fail stats cell narrows the runs table, and Total resets it', async () => {
    mockedGet.mockResolvedValue(makeExecutionWithRuns(runs, { status: 'InProgress' }));
    renderDetail('Viewer');
    await screen.findByText('Login');

    fireEvent.click(screen.getByRole('button', { name: /^Fail/ }));
    expect(screen.queryByText('Login')).toBeNull();
    expect(screen.getByText('Checkout')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Total/ }));
    expect(screen.getByText('Login')).toBeTruthy();
  });

  it('a Contributor on a Ready execution sees only Back to Draft and Run All', async () => {
    mockedGet.mockResolvedValue(makeExecutionWithRuns(runs, { status: 'Ready' }));
    renderDetail('Contributor');
    await screen.findByText('Login');

    expect(screen.getByRole('button', { name: 'Back to Draft' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Run All' })).toBeTruthy();
    for (const name of ['Delete', 'Sign Off', 'Mark as Ready', 'Edit', 'Pause']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('a Viewer sees no lifecycle actions', async () => {
    mockedGet.mockResolvedValue(makeExecutionWithRuns(runs, { status: 'Draft' }));
    renderDetail('Viewer');
    await screen.findByText('Login');

    for (const name of ['Edit', 'Mark as Ready', 'Delete']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('Run All asks for the mode and starts in Manual mode', async () => {
    const ready = makeExecutionWithRuns(runs, { status: 'Ready' });
    mockedGet.mockResolvedValue(ready);
    mockedTransition.mockResolvedValue({ ...ready, status: 'InProgress', lastResumedAt: ready.now });
    renderDetail('Contributor');

    fireEvent.click(await screen.findByRole('button', { name: 'Run All' }));
    const dialog = await screen.findByRole('dialog');
    expect((within(dialog).getByRole('button', { name: /Automated/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run manually' }));

    await waitFor(() => expect(mockedTransition).toHaveBeenCalledWith(expect.anything(), 'p1', 'exec-1', 'run-all', 'Manual'));
    expect(await screen.findByText('In Progress')).toBeTruthy();
  });

  it("a refused Sign Off shows the server's reason and the execution stays Completed", async () => {
    mockedGet.mockResolvedValue(makeExecutionWithRuns(runs, { status: 'Completed' }));
    mockedTransition.mockRejectedValue(new ApiError(409, 'resolve every Needs Review run to Pass or Fail before signing off', '/x'));
    renderDetail('Admin');

    fireEvent.click(await screen.findByRole('button', { name: 'Sign Off' }));

    expect((await screen.findByRole('alert')).textContent).toContain('resolve every Needs Review run');
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  describe('run panel', () => {
    it('a Contributor sets Fail; the table and stats update, and the last outcome completes the execution', async () => {
      const inProgress = makeExecutionWithRuns(runs, { status: 'InProgress', lastResumedAt: '2026-10-25T09:59:00.000Z' });
      mockedGet.mockResolvedValue(inProgress);
      const updatedRuns = runs.map((run) => (run.id === 'r3' ? { ...run, outcome: 'Fail' as const } : run));
      mockedSetOutcome.mockResolvedValue(
        makeExecutionWithRuns(updatedRuns, { status: 'Completed', elapsedMsAccumulated: 60_000, lastResumedAt: null }),
      );
      renderDetail('Contributor');

      fireEvent.click(await screen.findByRole('button', { name: 'Logout' }));
      const panel = await screen.findByRole('dialog');
      fireEvent.click(within(panel).getByRole('button', { name: 'Fail' }));

      await waitFor(() => expect(mockedSetOutcome).toHaveBeenCalledWith(expect.anything(), 'p1', 'exec-1', 'r3', 'Fail'));
      expect(await screen.findByText('Completed')).toBeTruthy();
      // The open panel makes the page behind it aria-hidden, hence `hidden: true`.
      const stats = screen.getByRole('group', { name: 'Run statistics', hidden: true });
      expect(within(stats).getByRole('button', { name: /^Fail/, hidden: true }).textContent).toBe('Fail2');
      expect(screen.getByLabelText('Elapsed time').textContent).toBe('1:00');
    });

    it('offers no outcome control while Paused', async () => {
      mockedGet.mockResolvedValue(makeExecutionWithRuns(runs, { status: 'Paused' }));
      renderDetail('Contributor');

      fireEvent.click(await screen.findByRole('button', { name: 'Logout' }));
      const panel = await screen.findByRole('dialog');
      expect(within(panel).queryByRole('group', { name: 'Set outcome' })).toBeNull();
    });

    it('offers no outcome control to a Viewer', async () => {
      mockedGet.mockResolvedValue(makeExecutionWithRuns(runs, { status: 'InProgress' }));
      renderDetail('Viewer');

      fireEvent.click(await screen.findByRole('button', { name: 'Logout' }));
      const panel = await screen.findByRole('dialog');
      expect(within(panel).queryByRole('group', { name: 'Set outcome' })).toBeNull();
      // GherkinView renders the keyword in its own span, so match the whole line's text.
      expect(within(panel).getAllByRole('listitem').some((li) => li.textContent?.includes('Given a user'))).toBe(true);
    });
  });
});

describe('ExecutionDetail polling', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['InProgress', 2],
    ['Paused', 2],
    ['Draft', 1],
  ] as const)('a %s execution is fetched %i time(s) within 5 seconds', async (status, calls) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedGet.mockReset().mockResolvedValue(makeExecutionWithRuns(runs, { status }));
    renderDetail('Viewer');
    await screen.findByText('Login');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(mockedGet).toHaveBeenCalledTimes(calls);
  });
});

describe('ExecutionHeader timer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances once per second while In Progress', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T10:00:00.000Z'));
    const execution = makeExecution({
      status: 'InProgress',
      elapsedMsAccumulated: 60_000,
      lastResumedAt: '2026-10-25T09:59:55.000Z',
      now: '2026-10-25T10:00:00.000Z',
    });

    renderWithProviders(<ExecutionHeader execution={execution} onOpenEnvironment={() => {}} actions={null} />);
    expect(screen.getByLabelText('Elapsed time').textContent).toBe('1:05');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByLabelText('Elapsed time').textContent).toBe('1:06');
  });

  it('does not advance while Paused', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T10:00:00.000Z'));
    const execution = makeExecution({ status: 'Paused', elapsedMsAccumulated: 90_000, lastResumedAt: null });

    renderWithProviders(<ExecutionHeader execution={execution} onOpenEnvironment={() => {}} actions={null} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText('Elapsed time').textContent).toBe('1:30');
  });

  it("shows a deleted environment as no longer available, with nothing to open", () => {
    const execution = makeExecution({ environmentId: null, environmentName: 'Old staging' });
    renderWithProviders(<ExecutionHeader execution={execution} onOpenEnvironment={() => {}} actions={null} />);

    expect(screen.getByText('Old staging (no longer available)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Old staging' })).toBeNull();
  });
});

describe('ExecutionDetail: reordering runs', () => {
  mockSortableLayout();

  const draftRuns = [
    makeRun({ id: 'r1', position: 1, testCaseName: 'Login' }),
    makeRun({ id: 'r2', position: 2, testCaseName: 'Checkout' }),
    makeRun({ id: 'r3', position: 3, testCaseName: 'Logout' }),
  ];
  const testCaseNames = () =>
    screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getByRole('button', { name: /^(Login|Checkout|Logout)$/ }).textContent);

  beforeEach(() => {
    mockedGet.mockReset();
    vi.mocked(moveRun).mockReset();
  });

  it('a Contributor drags a Draft run to the top; the API is called and the new order shows', async () => {
    const draft = makeExecutionWithRuns(draftRuns);
    mockedGet.mockResolvedValue(draft);
    vi.mocked(moveRun).mockResolvedValue(
      makeExecutionWithRuns([
        { ...draftRuns[2], position: 1 },
        { ...draftRuns[0], position: 2 },
        { ...draftRuns[1], position: 3 },
      ]),
    );
    renderDetail('Contributor');

    await keyboardDrag(await screen.findByRole('button', { name: 'Reorder Logout' }), 'ArrowUp', 2);

    await waitFor(() => expect(moveRun).toHaveBeenCalledWith(expect.anything(), 'p1', 'exec-1', 'r3', null));
    await waitFor(() => expect(testCaseNames()).toEqual(['Logout', 'Login', 'Checkout']));
  });

  it('offers no reordering to a Viewer, outside Draft, or while an outcome filter is active', async () => {
    mockedGet.mockResolvedValue(makeExecutionWithRuns(draftRuns));
    const viewer = renderDetail('Viewer');
    await screen.findByText('Login');
    expect(screen.queryByRole('button', { name: /^Reorder/ })).toBeNull();
    viewer.unmount();

    mockedGet.mockResolvedValue(makeExecutionWithRuns(draftRuns, { status: 'Ready' }));
    const ready = renderDetail('Contributor');
    await screen.findByText('Login');
    expect(screen.queryByRole('button', { name: /^Reorder/ })).toBeNull();
    ready.unmount();

    mockedGet.mockResolvedValue(makeExecutionWithRuns(draftRuns));
    renderDetail('Contributor');
    await screen.findByRole('button', { name: 'Reorder Login' });
    fireEvent.click(screen.getByRole('button', { name: /Pending/ }));
    expect(screen.queryByRole('button', { name: /^Reorder/ })).toBeNull();
  });

  it("a refused move restores the previous order and shows the server's reason", async () => {
    mockedGet.mockResolvedValue(makeExecutionWithRuns(draftRuns));
    vi.mocked(moveRun).mockRejectedValue(new ApiError(409, "only a Draft execution's runs can be reordered; this one is Ready", '/x'));
    renderDetail('Contributor');

    await keyboardDrag(await screen.findByRole('button', { name: 'Reorder Logout' }), 'ArrowUp', 2);

    expect(await screen.findByText(/only a Draft execution's runs can be reordered/)).toBeTruthy();
    expect(testCaseNames()).toEqual(['Login', 'Checkout', 'Logout']);
  });
});
