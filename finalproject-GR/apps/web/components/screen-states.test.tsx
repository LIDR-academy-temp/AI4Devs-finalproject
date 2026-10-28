import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { TestCaseTree } from './test-cases/test-case-tree';
import { TestCasesScreen } from './test-cases/test-cases-screen';
import { ExecutionList } from './executions/execution-list';
import { BugList } from './bugs/bug-list';
import { listTestCases } from '../lib/test-cases-api';
import { listExecutions } from '../lib/executions-api';
import { listBugs } from '../lib/bugs-api';
import { useSessionContext } from '../lib/session-context';
import { renderWithProviders } from '../test/render-with-providers';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../lib/session-context', () => ({ useSessionContext: vi.fn() }));
vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../lib/test-cases-api', () => ({ listTestCases: vi.fn() }));
vi.mock('../lib/folders-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/folders-api')>()),
  listFolders: vi.fn().mockResolvedValue([]),
}));
vi.mock('../lib/executions-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/executions-api')>()),
  listExecutions: vi.fn(),
}));
vi.mock('../lib/bugs-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/bugs-api')>()),
  listBugs: vi.fn(),
}));

const listProps = { projectId: 'p1', selectedId: null, onSelect: () => {}, canCreate: false, onCreateClick: () => {} };

describe.each([
  [
    'Test Cases',
    () => vi.mocked(listTestCases),
    () => <TestCaseTree projectId="p1" selected={null} onSelect={() => {}} canCreate={false} canDelete={false} onAction={() => {}} />,
    "Couldn't load test cases.",
  ],
  ['Executions', () => vi.mocked(listExecutions), () => <ExecutionList {...listProps} />, "Couldn't load executions."],
  ['Bugs', () => vi.mocked(listBugs), () => <BugList {...listProps} />, "Couldn't load bugs."],
] as const)('%s list', (_name, mocked, element, message) => {
  beforeEach(() => {
    mocked().mockReset();
  });

  it('shows an error state on load failure, and Retry loads again', async () => {
    mocked().mockRejectedValueOnce(new Error('boom')).mockResolvedValue([] as never);
    renderWithProviders(element());

    expect((await screen.findByRole('alert')).textContent).toContain(message);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(mocked()).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/^No .* yet\.$/)).toBeTruthy();
  });
});

describe('Test Cases screen', () => {
  it('prompts to select a test case when none is selected', async () => {
    vi.mocked(useSessionContext).mockReturnValue({
      data: { workspaceId: 'w1', projectId: 'p1', projectName: 'Project', role: 'Viewer' },
      loading: false,
      error: null,
    } as ReturnType<typeof useSessionContext>);
    vi.mocked(listTestCases).mockResolvedValue([]);
    renderWithProviders(<TestCasesScreen />);

    expect(await screen.findByText('Select a test case to see its details.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Test Cases' })).toBeTruthy();
  });
});
