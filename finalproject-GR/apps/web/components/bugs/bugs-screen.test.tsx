import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { BugsScreen } from './bugs-screen';
import { BugList } from './bug-list';
import { BugDetail } from './bug-detail';
import { BugFormDialog } from './bug-form-dialog';
import { createBug, deleteBug, getBug, listBugs, updateBug } from '../../lib/bugs-api';
import { useSessionContext } from '../../lib/session-context';
import { renderWithProviders } from '../../test/render-with-providers';
import { makeBug } from '../../test/bug-fixtures';
import { makeRun } from '../../test/execution-fixtures';

const replace = vi.fn();
let search = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/bugs',
  useSearchParams: () => search,
}));
vi.mock('../../lib/session-context', () => ({ useSessionContext: vi.fn() }));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/bugs-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/bugs-api')>()),
  listBugs: vi.fn(),
  getBug: vi.fn(),
  createBug: vi.fn(),
  updateBug: vi.fn(),
  deleteBug: vi.fn(),
}));

const SCRIPT = 'Feature: Checkout\n  Given a cart\n  Then the total is $10';
const linkedBug = makeBug({
  id: 'bug-linked',
  title: 'Total is wrong',
  gherkinSnapshot: SCRIPT,
  failedStep: 'Then the total is $10',
  testCaseNameSnapshot: 'Checkout',
  run: { id: 'run-2', executionId: 'exec-9', executionName: 'Smoke', position: 2, outcome: 'Fail', deleted: false },
  testCase: { id: 'tc-1', deleted: false },
});

describe('BugsScreen', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(useSessionContext).mockReturnValue({
      data: { workspaceId: 'w1', projectId: 'p1', projectName: 'Project', role: 'Viewer' },
      loading: false,
      error: null,
    } as ReturnType<typeof useSessionContext>);
    vi.mocked(listBugs).mockResolvedValue([makeBug({ id: 'bug-1', title: 'First' }), linkedBug]);
    vi.mocked(getBug).mockImplementation(async (_client, _projectId, id) => (id === linkedBug.id ? linkedBug : makeBug({ id, title: 'First' })));
  });

  it('shows the bug named in ?bug=, and selecting another puts it in the URL', async () => {
    search = new URLSearchParams('bug=bug-linked');
    renderWithProviders(<BugsScreen />);

    expect(await screen.findByRole('heading', { name: 'Total is wrong' })).toBeTruthy();
    fireEvent.click(screen.getByText('First'));
    expect(replace).toHaveBeenCalledWith('/bugs?bug=bug-1');
  });
});

describe('BugList', () => {
  const renderList = (canCreate: boolean) =>
    renderWithProviders(<BugList projectId="p1" selectedId={null} onSelect={() => {}} canCreate={canCreate} onCreateClick={() => {}} />);

  it('filtering by status narrows the list', async () => {
    vi.mocked(listBugs).mockResolvedValue([
      makeBug({ id: 'a', title: 'Open one', status: 'Open' }),
      makeBug({ id: 'b', title: 'Closed one', status: 'Closed' }),
    ]);
    renderList(false);
    await screen.findByText('Open one');

    fireEvent.click(screen.getByLabelText('Filter by status'));
    fireEvent.click(await screen.findByRole('option', { name: 'Closed' }));

    expect(screen.queryByText('Open one')).toBeNull();
    expect(screen.getByText('Closed one')).toBeTruthy();
  });

  it('sorting by severity (Critical → Low) puts Critical first', async () => {
    vi.mocked(listBugs).mockResolvedValue([
      makeBug({ id: 'a', title: 'Minor', severity: 'Low' }),
      makeBug({ id: 'b', title: 'Outage', severity: 'Critical' }),
    ]);
    renderList(false);
    await screen.findByText('Minor');

    fireEvent.click(screen.getByLabelText('Sort'));
    fireEvent.click(await screen.findByRole('option', { name: 'Severity (Critical → Low)' }));

    const titles = within(screen.getByRole('list', { name: 'Bugs' })).getAllByRole('button').map((b) => b.textContent);
    expect(titles[0]).toContain('Outage');
  });

  it('a Viewer sees the empty state with no way to file', async () => {
    vi.mocked(listBugs).mockResolvedValue([]);
    renderList(false);

    expect(await screen.findByText('No bugs yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /new bug|file the first bug/i })).toBeNull();
  });
});

describe('BugDetail', () => {
  beforeEach(() => {
    vi.mocked(getBug).mockReset();
    vi.mocked(updateBug).mockReset();
    vi.mocked(deleteBug).mockReset();
  });

  const renderDetail = (role: 'Viewer' | 'Contributor' | 'Admin', onDeleted = vi.fn()) => {
    renderWithProviders(<BugDetail projectId="p1" bugId="bug-linked" role={role} onDeleted={onDeleted} />);
    return { onDeleted };
  };

  it('links to the execution and test case, and highlights the failed step', async () => {
    vi.mocked(getBug).mockResolvedValue(linkedBug);
    renderDetail('Viewer');

    const runLink = await screen.findByRole('link', { name: /Smoke · run #2 · Fail/ });
    expect(runLink.getAttribute('href')).toBe('/executions?execution=exec-9');
    expect(screen.getByRole('link', { name: 'Checkout' }).getAttribute('href')).toBe('/test-cases?testCase=tc-1');
    expect(screen.getByLabelText('Failed step').textContent).toContain('Then the total is $10');
  });

  it('a Viewer sees no editable fields', async () => {
    vi.mocked(getBug).mockResolvedValue(linkedBug);
    renderDetail('Viewer');
    await screen.findByRole('heading', { name: 'Total is wrong' });

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByLabelText('Status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('a Contributor changes the status and the view updates', async () => {
    vi.mocked(getBug).mockResolvedValue(linkedBug);
    vi.mocked(updateBug).mockResolvedValue({ ...linkedBug, status: 'InProgress' });
    renderDetail('Contributor');

    fireEvent.click(await screen.findByLabelText('Status'));
    fireEvent.click(await screen.findByRole('option', { name: 'In Progress' }));

    await waitFor(() => expect(updateBug).toHaveBeenCalledWith(expect.anything(), 'p1', 'bug-linked', { status: 'InProgress' }));
    expect((await screen.findByLabelText('Status')).textContent).toContain('In Progress');
  });

  it('shows a deleted test case as plain text, and a manual bug as having no links', async () => {
    vi.mocked(getBug).mockResolvedValue({ ...linkedBug, testCase: { id: 'tc-1', deleted: true } });
    renderDetail('Viewer');
    expect(await screen.findByText('Checkout (deleted)')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Checkout' })).toBeNull();
  });

  it('a manual bug has no run, test case or snapshot', async () => {
    vi.mocked(getBug).mockResolvedValue(makeBug({ id: 'bug-linked', title: 'Manual' }));
    renderDetail('Viewer');

    await screen.findByRole('heading', { name: 'Manual' });
    expect(screen.getAllByText('None')).toHaveLength(2);
    expect(screen.getByText(/wasn.t filed from a run/)).toBeTruthy();
  });

  it('an Admin deletes after confirming', async () => {
    vi.mocked(getBug).mockResolvedValue(linkedBug);
    vi.mocked(deleteBug).mockResolvedValue(undefined);
    const { onDeleted } = renderDetail('Admin');

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });
});

describe('BugFormDialog', () => {
  beforeEach(() => {
    vi.mocked(createBug).mockReset().mockResolvedValue(makeBug({ id: 'new-bug' }));
  });

  it('requires a title', async () => {
    renderWithProviders(<BugFormDialog projectId="p1" open onOpenChange={() => {}} onSaved={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'File bug' }));

    expect(await screen.findByText('Title is required')).toBeTruthy();
    expect(createBug).not.toHaveBeenCalled();
  });

  it('without a run, there is no failed-step picker and no run is sent', async () => {
    const onSaved = vi.fn();
    renderWithProviders(<BugFormDialog projectId="p1" open onOpenChange={() => {}} onSaved={onSaved} />);

    expect(screen.queryByRole('radiogroup', { name: 'Failed step' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Broken' } });
    fireEvent.click(screen.getByRole('button', { name: 'File bug' }));

    await waitFor(() =>
      expect(createBug).toHaveBeenCalledWith(expect.anything(), 'p1', {
        title: 'Broken',
        severity: 'Medium',
        description: null,
        stepsToReproduce: null,
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('from a run, pre-fills the title and sends the picked failed step', async () => {
    const run = makeRun({ id: 'run-7', testCaseName: 'Checkout', gherkinScript: SCRIPT });
    renderWithProviders(<BugFormDialog projectId="p1" open onOpenChange={() => {}} run={run} onSaved={() => {}} />);

    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Checkout');
    fireEvent.click(screen.getByLabelText('Then the total is $10'));
    fireEvent.click(screen.getByRole('button', { name: 'File bug' }));

    await waitFor(() =>
      expect(createBug).toHaveBeenCalledWith(
        expect.anything(),
        'p1',
        expect.objectContaining({ testRunId: 'run-7', failedStep: 'Then the total is $10' }),
      ),
    );
  });
});
