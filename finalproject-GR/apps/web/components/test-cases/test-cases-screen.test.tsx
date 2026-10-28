import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { TestCasesScreen } from './test-cases-screen';
import { getTestCase, listTestCases } from '../../lib/test-cases-api';
import { createExecution } from '../../lib/executions-api';
import { listEnvironments } from '../../lib/environments-api';
import { useSessionContext } from '../../lib/session-context';
import type { ProjectRole } from '../../lib/test-case-permissions';
import { renderWithProviders } from '../../test/render-with-providers';
import { makeExecution } from '../../test/execution-fixtures';

const push = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => '/test-cases',
  useSearchParams: () => search,
}));
vi.mock('../../lib/session-context', () => ({ useSessionContext: vi.fn() }));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/test-cases-api', () => ({
  listTestCases: vi.fn(),
  getTestCase: vi.fn(),
  updateTestCase: vi.fn(),
  deleteTestCase: vi.fn(),
  createTestCase: vi.fn(),
}));
vi.mock('../../lib/executions-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/executions-api')>()),
  createExecution: vi.fn(),
}));
vi.mock('../../lib/environments-api', () => ({ listEnvironments: vi.fn() }));
vi.mock('../../lib/folders-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/folders-api')>()),
  listFolders: vi.fn().mockResolvedValue([]),
}));

const ready = { id: 'tc-ready', name: 'Login works', gherkinScript: null, status: 'Ready' as const, sourceType: 'Manual' as const };
const draft = { ...ready, id: 'tc-draft', name: 'Not finished', status: 'Draft' as const };
const deprecated = { ...ready, id: 'tc-old', name: 'Obsolete', status: 'Deprecated' as const };

function asRole(role: ProjectRole) {
  vi.mocked(useSessionContext).mockReturnValue({
    data: { workspaceId: 'w1', projectId: 'p1', projectName: 'Project', role },
    loading: false,
    error: null,
  } as ReturnType<typeof useSessionContext>);
}

async function openTestCase(name: string) {
  fireEvent.click(await screen.findByText(name));
  // Tree rows don't show the source type, so "Manual" appears once the detail has loaded.
  await screen.findByText('Manual');
}

describe('Run from a test case', () => {
  beforeEach(() => {
    push.mockReset();
    search = new URLSearchParams();
    vi.mocked(listTestCases).mockResolvedValue([ready, draft, deprecated]);
    vi.mocked(getTestCase).mockImplementation(async (_client, _projectId, id) =>
      [ready, draft, deprecated].find((testCase) => testCase.id === id)!,
    );
    vi.mocked(listEnvironments).mockResolvedValue([]);
  });

  it('a Contributor runs a Ready test case and lands on the new execution', async () => {
    asRole('Contributor');
    vi.mocked(createExecution).mockResolvedValue(makeExecution({ id: 'new-exec' }));
    renderWithProviders(<TestCasesScreen />);

    await openTestCase('Login works');
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));

    const dialog = await screen.findByRole('dialog');
    expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe('Login works');
    expect(within(dialog).getByRole('list', { name: 'Selected test cases' }).textContent).toContain('Login works');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create execution' }));

    await waitFor(() =>
      expect(createExecution).toHaveBeenCalledWith(
        expect.anything(),
        'p1',
        expect.objectContaining({ name: 'Login works', testCaseIds: ['tc-ready'] }),
      ),
    );
    expect(push).toHaveBeenCalledWith('/executions?execution=new-exec');
  });

  it.each(['Not finished', 'Obsolete'])('Run is not offered for a non-Ready test case (%s)', async (name) => {
    asRole('Contributor');
    renderWithProviders(<TestCasesScreen />);

    await openTestCase(name);

    expect(screen.queryByRole('button', { name: 'Run' })).toBeNull();
  });

  it('Run is not offered to a Viewer', async () => {
    asRole('Viewer');
    renderWithProviders(<TestCasesScreen />);

    await openTestCase('Login works');

    expect(screen.queryByRole('button', { name: 'Run' })).toBeNull();
  });

  it('?testCase=<id> opens on that test case', async () => {
    asRole('Viewer');
    search = new URLSearchParams('testCase=tc-old');
    renderWithProviders(<TestCasesScreen />);

    await waitFor(() => expect(getTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', 'tc-old'));
    // Tree row + detail both show the name once the detail has loaded.
    await screen.findByText('Manual');
    expect(screen.getAllByText('Obsolete').length).toBeGreaterThan(1);
  });
});
