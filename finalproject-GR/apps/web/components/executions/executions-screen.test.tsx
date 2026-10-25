import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ExecutionsScreen } from './executions-screen';
import { getExecution, listExecutions } from '../../lib/executions-api';
import { useSessionContext } from '../../lib/session-context';
import { renderWithProviders } from '../../test/render-with-providers';
import { makeExecution, makeExecutionWithRuns, makeRun } from '../../test/execution-fixtures';

const replace = vi.fn();
let search = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/executions',
  useSearchParams: () => search,
}));
vi.mock('../../lib/session-context', () => ({ useSessionContext: vi.fn() }));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/executions-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/executions-api')>()),
  listExecutions: vi.fn(),
  getExecution: vi.fn(),
}));

describe('ExecutionsScreen', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(useSessionContext).mockReturnValue({
      data: { workspaceId: 'w1', projectId: 'p1', projectName: 'Project', role: 'Viewer' },
      loading: false,
      error: null,
    } as ReturnType<typeof useSessionContext>);
    vi.mocked(listExecutions).mockResolvedValue([
      makeExecution({ id: 'exec-1', name: 'First' }),
      makeExecution({ id: 'exec-2', name: 'Second' }),
    ]);
    vi.mocked(getExecution).mockImplementation(async (_client, _projectId, id) =>
      makeExecutionWithRuns([makeRun({ testCaseName: `Run of ${id}` })], { id }),
    );
  });

  it('shows the execution named in ?execution=', async () => {
    search = new URLSearchParams('execution=exec-2');
    renderWithProviders(<ExecutionsScreen />);

    expect(await screen.findByText('Run of exec-2')).toBeTruthy();
  });

  it('selecting another execution puts it in the URL', async () => {
    search = new URLSearchParams('execution=exec-2');
    renderWithProviders(<ExecutionsScreen />);

    fireEvent.click(await screen.findByText('First'));

    expect(replace).toHaveBeenCalledWith('/executions?execution=exec-1');
  });

  it('prompts to select when nothing is selected', async () => {
    search = new URLSearchParams();
    renderWithProviders(<ExecutionsScreen />);

    expect(await screen.findByText('Select an execution to see its runs.')).toBeTruthy();
  });
});
