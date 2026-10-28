import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ExecutionFormDialog } from './execution-form-dialog';
import { ExecutionDetail } from './execution-detail';
import { createExecution, getExecution, updateExecution } from '../../lib/executions-api';
import { listTestCases } from '../../lib/test-cases-api';
import { listEnvironments } from '../../lib/environments-api';
import { renderWithProviders } from '../../test/render-with-providers';
import { keyboardDrag, mockSortableLayout } from '../../test/keyboard-drag';
import { makeExecutionWithRuns, makeRun } from '../../test/execution-fixtures';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/executions-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/executions-api')>()),
  createExecution: vi.fn(),
  updateExecution: vi.fn(),
  getExecution: vi.fn(),
}));
vi.mock('../../lib/test-cases-api', () => ({ listTestCases: vi.fn() }));
vi.mock('../../lib/folders-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/folders-api')>()),
  listFolders: vi.fn(async () => []),
}));
vi.mock('../../lib/environments-api', () => ({ listEnvironments: vi.fn(), getEnvironment: vi.fn() }));

const mockedCreate = vi.mocked(createExecution);
const mockedUpdate = vi.mocked(updateExecution);

const testCase = (id: string, name: string, status: 'Draft' | 'Ready' | 'Deprecated' = 'Ready') => ({
  id,
  name,
  status,
  gherkinScript: null,
  sourceType: 'Manual' as const,
  folderId: null,
  positionKey: id,
  lastOutcome: null,
});

const selectedNames = () =>
  within(screen.getByRole('list', { name: 'Selected test cases' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('ExecutionFormDialog', () => {
  mockSortableLayout();

  beforeEach(() => {
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    vi.mocked(listTestCases).mockResolvedValue([
      testCase('tc-a', 'Alpha'),
      testCase('tc-b', 'Beta'),
      testCase('tc-draft', 'Unfinished', 'Draft'),
      testCase('tc-old', 'Obsolete', 'Deprecated'),
    ]);
    vi.mocked(listEnvironments).mockResolvedValue([]);
  });

  function renderCreate(onSaved = vi.fn()) {
    renderWithProviders(<ExecutionFormDialog projectId="p1" open onOpenChange={() => {}} onSaved={onSaved} />);
    return { onSaved };
  }

  it('shows every test case but only lets Ready ones be picked', async () => {
    renderCreate();

    expect((await screen.findByLabelText('Alpha')) as HTMLButtonElement).toHaveProperty('disabled', false);
    expect(screen.getByLabelText('Beta')).toHaveProperty('disabled', false);
    expect(screen.getByLabelText('Unfinished')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Obsolete')).toHaveProperty('disabled', true);
  });

  it('requires a name and at least one test case', async () => {
    renderCreate();
    await screen.findByLabelText('Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Create execution' }));

    expect(await screen.findByText('Name is required')).toBeTruthy();
    expect(screen.getByText('Pick at least one test case')).toBeTruthy();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('sends test cases in the Selected panel order', async () => {
    const created = makeExecutionWithRuns([], { id: 'new-exec' });
    mockedCreate.mockResolvedValue(created);
    const { onSaved } = renderCreate();

    fireEvent.click(await screen.findByLabelText('Beta'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Smoke' } });
    fireEvent.click(screen.getByLabelText('Alpha'));
    expect(selectedNames()).toEqual(['1Beta', '2Alpha']);

    fireEvent.click(screen.getByRole('button', { name: 'Create execution' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.anything(),
        'p1',
        expect.objectContaining({ name: 'Smoke', testCaseIds: ['tc-b', 'tc-a'], environmentId: null, browser: 'Chromium' }),
      ),
    );
    expect(onSaved).toHaveBeenCalledWith(created);
  });

  it('reordering in the Selected panel changes the order sent', async () => {
    mockedCreate.mockResolvedValue(makeExecutionWithRuns([], { id: 'new-exec' }));
    renderWithProviders(
      <ExecutionFormDialog projectId="p1" open onOpenChange={() => {}} initialTestCaseIds={['tc-a', 'tc-b']} defaultName="Run" onSaved={() => {}} />,
    );
    await screen.findByLabelText('Alpha');

    await keyboardDrag(screen.getByRole('button', { name: 'Reorder Alpha' }), 'ArrowDown');
    await waitFor(() => expect(selectedNames()).toEqual(['1Beta', '2Alpha']));
    fireEvent.click(screen.getByRole('button', { name: 'Create execution' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(expect.anything(), 'p1', expect.objectContaining({ testCaseIds: ['tc-b', 'tc-a'] })),
    );
  });

  it('a test case picked up front (Run) is selected and checked', async () => {
    renderWithProviders(
      <ExecutionFormDialog projectId="p1" open onOpenChange={() => {}} initialTestCaseIds={['tc-b']} onSaved={() => {}} />,
    );

    expect((await screen.findByLabelText('Beta')).getAttribute('data-state')).toBe('checked');
    expect(selectedNames()).toEqual(['1Beta']);
  });

  it('removing from the Selected panel unchecks it in the tree', async () => {
    renderWithProviders(
      <ExecutionFormDialog projectId="p1" open onOpenChange={() => {}} initialTestCaseIds={['tc-a', 'tc-b']} onSaved={() => {}} />,
    );
    await screen.findByLabelText('Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha' }));

    expect(screen.getByLabelText('Alpha').getAttribute('data-state')).toBe('unchecked');
    expect(selectedNames()).toEqual(['1Beta']);
  });

  it('editing without touching the test cases does not resend them', async () => {
    const draft = makeExecutionWithRuns(
      [makeRun({ id: 'r1', testCaseId: 'tc-a' }), makeRun({ id: 'r2', position: 2, testCaseId: 'tc-b' })],
      { name: 'Old name' },
    );
    mockedUpdate.mockResolvedValue({ ...draft, name: 'New name' });
    renderWithProviders(
      <ExecutionFormDialog projectId="p1" open onOpenChange={() => {}} execution={draft} onSaved={() => {}} />,
    );

    const name = await screen.findByLabelText('Name');
    expect((name as HTMLInputElement).value).toBe('Old name');
    fireEvent.change(name, { target: { value: 'New name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
    const [, , , input] = mockedUpdate.mock.calls[0];
    expect(input).toMatchObject({ name: 'New name' });
    expect(input).not.toHaveProperty('testCaseIds');
  });
});

describe('Edit from the execution detail', () => {
  it('Edit on a Draft opens the form pre-filled, and saving updates the detail', async () => {
    const draft = makeExecutionWithRuns([makeRun({ testCaseId: 'tc-a', testCaseName: 'Alpha' })], { name: 'Draft one' });
    vi.mocked(getExecution).mockResolvedValue(draft);
    vi.mocked(listTestCases).mockResolvedValue([testCase('tc-a', 'Alpha')]);
    vi.mocked(listEnvironments).mockResolvedValue([]);
    mockedUpdate.mockResolvedValue({ ...draft, name: 'Renamed draft' });
    renderWithProviders(<ExecutionDetail projectId="p1" executionId="exec-1" role="Contributor" onDeleted={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const name = await screen.findByLabelText('Name');
    expect((name as HTMLInputElement).value).toBe('Draft one');
    fireEvent.change(name, { target: { value: 'Renamed draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('heading', { name: 'Renamed draft' })).toBeTruthy();
  });
});
