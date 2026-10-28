import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { notifySuccess } from '../lib/notify';
import { ApiError } from '../lib/api-client';
import { createExecution, getExecution, transitionExecution } from '../lib/executions-api';
import { getBug, updateBug } from '../lib/bugs-api';
import { listTestCases } from '../lib/test-cases-api';
import { listEnvironments } from '../lib/environments-api';
import { ExecutionFormDialog } from './executions/execution-form-dialog';
import { ExecutionDetail } from './executions/execution-detail';
import { BugDetail } from './bugs/bug-detail';
import { renderWithProviders } from '../test/render-with-providers';
import { makeExecution, makeExecutionWithRuns, makeRun } from '../test/execution-fixtures';
import { makeBug } from '../test/bug-fixtures';

vi.mock('../lib/notify', () => ({ notifySuccess: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../lib/executions-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/executions-api')>()),
  createExecution: vi.fn(),
  getExecution: vi.fn(),
  transitionExecution: vi.fn(),
}));
vi.mock('../lib/bugs-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/bugs-api')>()),
  getBug: vi.fn(),
  updateBug: vi.fn(),
  listBugs: vi.fn().mockResolvedValue([]),
}));
vi.mock('../lib/test-cases-api', () => ({ listTestCases: vi.fn() }));
vi.mock('../lib/folders-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/folders-api')>()),
  listFolders: vi.fn(async () => []),
}));
vi.mock('../lib/environments-api', () => ({ listEnvironments: vi.fn(), getEnvironment: vi.fn() }));

describe('success notifications (web-ui-foundation)', () => {
  beforeEach(() => {
    vi.mocked(notifySuccess).mockClear();
  });

  it('creating an execution notifies once', async () => {
    vi.mocked(listTestCases).mockResolvedValue([
      { id: 'tc-a', name: 'Alpha', status: 'Ready', gherkinScript: null, sourceType: 'Manual' },
    ]);
    vi.mocked(listEnvironments).mockResolvedValue([]);
    vi.mocked(createExecution).mockResolvedValue(makeExecution({ id: 'new' }));
    renderWithProviders(<ExecutionFormDialog projectId="p1" open onOpenChange={() => {}} onSaved={() => {}} />);

    fireEvent.click(await screen.findByLabelText('Alpha'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Smoke' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create execution' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    expect(notifySuccess).toHaveBeenCalledWith('Execution created');
  });

  it("changing a bug's status notifies once", async () => {
    const bug = makeBug({ id: 'bug-1' });
    vi.mocked(getBug).mockResolvedValue(bug);
    vi.mocked(updateBug).mockResolvedValue({ ...bug, status: 'Resolved' });
    renderWithProviders(<BugDetail projectId="p1" bugId="bug-1" role="Contributor" onDeleted={() => {}} />);

    fireEvent.click(await screen.findByLabelText('Status'));
    fireEvent.click(await screen.findByRole('option', { name: 'Resolved' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    expect(notifySuccess).toHaveBeenCalledWith('Status changed to Resolved');
  });

  it('a refused Sign Off notifies nothing and still shows the reason inline', async () => {
    vi.mocked(getExecution).mockResolvedValue(makeExecutionWithRuns([makeRun({ outcome: 'NeedsReview' })], { status: 'Completed' }));
    vi.mocked(transitionExecution).mockRejectedValue(new ApiError(409, 'resolve every Needs Review run first', '/x'));
    renderWithProviders(<ExecutionDetail projectId="p1" executionId="exec-1" role="Admin" onDeleted={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sign Off' }));

    expect((await screen.findByRole('alert')).textContent).toContain('resolve every Needs Review run first');
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
