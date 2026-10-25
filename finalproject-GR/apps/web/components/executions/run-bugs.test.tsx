import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RunBugs } from './run-bugs';
import { createBug, linkBugToRun, listBugs } from '../../lib/bugs-api';
import { renderWithProviders } from '../../test/render-with-providers';
import { makeBug } from '../../test/bug-fixtures';
import { makeExecution, makeRun } from '../../test/execution-fixtures';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/executions',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/bugs-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/bugs-api')>()),
  listBugs: vi.fn(),
  createBug: vi.fn(),
  linkBugToRun: vi.fn(),
}));

const run = makeRun({ id: 'run-1', testCaseName: 'Checkout', gherkinScript: 'Given a cart\nThen the total is $10' });
const onRun = makeBug({ id: 'bug-on-run', title: 'Total is wrong' });
const manual = makeBug({ id: 'bug-manual', title: 'Manual bug', run: null });

function renderRunBugs(status: 'Draft' | 'InProgress', role: 'Viewer' | 'Contributor') {
  renderWithProviders(<RunBugs projectId="p1" execution={makeExecution({ status })} run={run} role={role} />);
}

describe('RunBugs', () => {
  beforeEach(() => {
    vi.mocked(listBugs).mockReset().mockImplementation(async (_client, _projectId, testRunId) =>
      testRunId ? [onRun] : [onRun, manual].map((bug) => (bug === onRun ? { ...bug, run: { id: 'run-1', executionId: 'e', executionName: 'E', position: 1, outcome: 'Fail' as const, deleted: false } } : bug)),
    );
    vi.mocked(createBug).mockReset();
    vi.mocked(linkBugToRun).mockReset();
  });

  it('lists the bugs linked to the run, each linking to the Bugs screen', async () => {
    renderRunBugs('InProgress', 'Viewer');

    const link = await screen.findByRole('link', { name: 'Total is wrong' });
    expect(link.getAttribute('href')).toBe('/bugs?bug=bug-on-run');
    expect(listBugs).toHaveBeenCalledWith(expect.anything(), 'p1', 'run-1');
  });

  it('offers neither File bug nor Link existing bug to a Viewer', async () => {
    renderRunBugs('InProgress', 'Viewer');
    await screen.findByRole('link', { name: 'Total is wrong' });
    expect(screen.queryByRole('button', { name: 'File bug' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Link existing bug' })).toBeNull();
  });

  it('is not offered on a Draft execution', async () => {
    renderRunBugs('Draft', 'Contributor');
    await screen.findByRole('link', { name: 'Total is wrong' });
    expect(screen.queryByRole('button', { name: 'File bug' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Link existing bug' })).toBeNull();
  });

  it('File bug files against the run with the picked failed step', async () => {
    vi.mocked(createBug).mockResolvedValue(makeBug({ id: 'new' }));
    renderRunBugs('InProgress', 'Contributor');

    fireEvent.click(await screen.findByRole('button', { name: 'File bug' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText('Then the total is $10'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'File bug' }));

    await waitFor(() =>
      expect(createBug).toHaveBeenCalledWith(
        expect.anything(),
        'p1',
        expect.objectContaining({ title: 'Checkout', testRunId: 'run-1', failedStep: 'Then the total is $10' }),
      ),
    );
  });

  it('Link existing bug offers only unlinked bugs and links the chosen one', async () => {
    vi.mocked(linkBugToRun).mockResolvedValue(manual);
    renderRunBugs('InProgress', 'Contributor');

    fireEvent.click(await screen.findByRole('button', { name: 'Link existing bug' }));
    fireEvent.click(await screen.findByLabelText('Bug to link'));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Manual bug']);
    fireEvent.click(options[0]);

    await waitFor(() => expect(linkBugToRun).toHaveBeenCalledWith(expect.anything(), 'p1', 'bug-manual', 'run-1'));
  });
});
