import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { ExecutionList } from './execution-list';
import { listExecutions } from '../../lib/executions-api';
import { renderWithProviders } from '../../test/render-with-providers';
import { makeExecution } from '../../test/execution-fixtures';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/executions-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/executions-api')>()),
  listExecutions: vi.fn(),
}));

const mockedList = vi.mocked(listExecutions);

function renderList(canCreate: boolean, onCreateClick = vi.fn()) {
  renderWithProviders(
    <ExecutionList projectId="p1" selectedId={null} onSelect={() => {}} canCreate={canCreate} onCreateClick={onCreateClick} />,
  );
  return { onCreateClick };
}

describe('ExecutionList', () => {
  beforeEach(() => {
    mockedList.mockReset();
  });

  it('shows each execution with status and counts', async () => {
    mockedList.mockResolvedValue([
      makeExecution({ id: 'a', name: 'Smoke', status: 'InProgress', counts: { total: 3, done: 1, pass: 1, fail: 0, needsReview: 0 } }),
    ]);
    renderList(false);

    const item = (await screen.findByText('Smoke')).closest('button')!;
    expect(within(item).getByText('In Progress')).toBeTruthy();
    expect(item.textContent).toContain('1/3 done · 1 pass · 0 fail · 0 needs review');
  });

  it('filtering by status narrows the list', async () => {
    mockedList.mockResolvedValue([
      makeExecution({ id: 'a', name: 'Running one', status: 'InProgress' }),
      makeExecution({ id: 'b', name: 'Draft one', status: 'Draft' }),
    ]);
    renderList(false);
    await screen.findByText('Running one');

    // Radix Select: open the trigger, then click the option.
    fireEvent.click(screen.getByLabelText('Filter by status'));
    fireEvent.click(await screen.findByRole('option', { name: 'Draft' }));

    expect(screen.queryByText('Running one')).toBeNull();
    expect(screen.getByText('Draft one')).toBeTruthy();
  });

  it('filtering by name is case-insensitive', async () => {
    mockedList.mockResolvedValue([makeExecution({ id: 'a', name: 'Smoke' }), makeExecution({ id: 'b', name: 'Regression' })]);
    renderList(false);
    await screen.findByText('Smoke');

    fireEvent.change(screen.getByLabelText('Filter by name'), { target: { value: 'SMO' } });

    expect(screen.getByText('Smoke')).toBeTruthy();
    expect(screen.queryByText('Regression')).toBeNull();
  });

  it('the empty state offers creation only to Contributors and above', async () => {
    mockedList.mockResolvedValue([]);
    const { onCreateClick } = renderList(true);

    fireEvent.click(await screen.findByRole('button', { name: 'Create the first execution' }));
    expect(onCreateClick).toHaveBeenCalled();
  });

  it('a Viewer sees the empty state with no way to create', async () => {
    mockedList.mockResolvedValue([]);
    renderList(false);

    expect(await screen.findByText('No executions yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /create|new execution/i })).toBeNull();
  });
});
