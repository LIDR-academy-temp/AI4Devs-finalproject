import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { CreateTestCaseDialog } from './create-test-case-dialog';
import { createTestCase } from '../../lib/test-cases-api';
import type { FolderNode } from '../../lib/test-case-tree';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/test-cases-api', () => ({
  createTestCase: vi.fn(),
}));
// Tags created during a test show up in later listTags calls, as after a refetch.
const tagStore = vi.hoisted(() => ({ created: [] as { id: string; name: string; color: 'gray'; testCaseCount: number }[] }));
vi.mock('../../lib/tags-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/tags-api')>()),
  listTags: vi.fn(async () => [{ id: 'tag-smoke', name: 'smoke', color: 'green', testCaseCount: 0, bugCount: 0 }, ...tagStore.created]),
  createTag: vi.fn(async (_client: unknown, _projectId: string, input: { name: string }) => {
    const tag = { id: 'tag-new', name: input.name, color: 'gray' as const, testCaseCount: 0, bugCount: 0 };
    tagStore.created.push(tag);
    return tag;
  }),
}));

const mockedCreateTestCase = createTestCase as unknown as ReturnType<typeof vi.fn>;

const FOLDERS: FolderNode[] = [
  { kind: 'folder', id: 'f-pay', name: 'Payments', parentId: null, children: [] },
  { kind: 'folder', id: 'f-auth', name: 'Auth', parentId: null, children: [] },
];

/** Owns `open` like the screen does, with a button to reopen. */
function Harness({ onCreated = vi.fn(), folders, initialFolderId }: { onCreated?: () => void; folders?: FolderNode[]; initialFolderId?: string | null }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <CreateTestCaseDialog
        projectId="p1"
        open={open}
        onOpenChange={setOpen}
        onCreated={onCreated}
        folders={folders}
        initialFolderId={initialFolderId}
      />
    </>
  );
}

describe('CreateTestCaseDialog', () => {
  beforeEach(() => {
    mockedCreateTestCase.mockReset();
    tagStore.created.length = 0;
  });

  it('submitting valid input creates the test case, reports it, and closes', async () => {
    const created = { id: 'tc-new', name: 'New case', gherkinScript: 'Given X', status: 'Draft', sourceType: 'Gherkin' };
    mockedCreateTestCase.mockResolvedValue(created);
    const onCreated = vi.fn();
    renderWithProviders(<Harness onCreated={onCreated} />);

    const dialog = screen.getByRole('dialog', { name: 'New test case' });
    fireEvent.change(within(dialog).getByLabelText('New test case name'), { target: { value: 'New case' } });
    fireEvent.change(within(dialog).getByLabelText('New test case script'), { target: { value: 'Given X' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create test case' }));

    await waitFor(() =>
      expect(mockedCreateTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', { name: 'New case', gherkinScript: 'Given X' }),
    );
    expect(onCreated).toHaveBeenCalledWith(created);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('submitting with only a name omits gherkinScript', async () => {
    mockedCreateTestCase.mockResolvedValue({ id: 'tc-new2', name: 'No script', gherkinScript: null, status: 'Draft', sourceType: 'Manual' });
    renderWithProviders(<Harness />);

    fireEvent.change(screen.getByLabelText('New test case name'), { target: { value: 'No script' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create test case' }));

    await waitFor(() => expect(mockedCreateTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', { name: 'No script' }));
  });

  it('an empty name shows a validation error and creates nothing', async () => {
    renderWithProviders(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Create test case' }));

    expect(await screen.findByText('Name is required')).toBeTruthy();
    expect(mockedCreateTestCase).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('preselects the initial folder and sends the chosen one', async () => {
    mockedCreateTestCase.mockResolvedValue({ id: 'tc-3', name: 'In auth' });
    renderWithProviders(<Harness folders={FOLDERS} initialFolderId="f-pay" />);

    const picker = screen.getByRole('radiogroup', { name: 'Destination folder' });
    expect((within(picker).getByRole('radio', { name: 'Payments' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(picker).getByRole('radio', { name: 'Auth' }));
    fireEvent.change(screen.getByLabelText('New test case name'), { target: { value: 'In auth' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create test case' }));

    await waitFor(() =>
      expect(mockedCreateTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', { name: 'In auth', folderId: 'f-auth' }),
    );
  });

  it('reopening after cancel starts with empty fields', async () => {
    renderWithProviders(<Harness />);
    fireEvent.change(screen.getByLabelText('New test case name'), { target: { value: 'Abandoned' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect((screen.getByLabelText('New test case name') as HTMLInputElement).value).toBe('');
    expect(mockedCreateTestCase).not.toHaveBeenCalled();
  });

  it('tags picked and created in the modal are sent with the new test case', async () => {
    mockedCreateTestCase.mockResolvedValue({ id: 'tc-tagged', name: 'Tagged' });
    renderWithProviders(<Harness />);

    fireEvent.change(screen.getByLabelText('New test case name'), { target: { value: 'Tagged' } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit tags' }));
    fireEvent.click(await screen.findByRole('option', { name: /smoke/ }));
    fireEvent.change(screen.getByPlaceholderText('Search or create a tag'), { target: { value: 'payments' } });
    fireEvent.click(screen.getByRole('option', { name: /Create “payments”/ }));
    // The new tag shows as a badge next to its picker option once it's selected.
    await waitFor(() => expect(screen.getAllByText('payments')).toHaveLength(2));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Create test case' }));

    await waitFor(() =>
      expect(mockedCreateTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', {
        name: 'Tagged',
        tagIds: ['tag-smoke', 'tag-new'],
      }),
    );
  });
});
