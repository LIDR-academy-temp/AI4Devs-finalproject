import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ManageTagsDialog } from './manage-tags-dialog';
import { deleteTag, listTags, updateTag, type Tag } from '../../lib/tags-api';
import { ApiError } from '../../lib/api-client';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/tags-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/tags-api')>()),
  listTags: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));

const TAGS: Tag[] = [
  { id: 't-legacy', name: 'legacy', color: 'gray', testCaseCount: 3, bugCount: 1 },
  { id: 't-smoke', name: 'smoke', color: 'green', testCaseCount: 1, bugCount: 0 },
];

function renderDialog(role: 'Viewer' | 'Contributor' | 'Admin') {
  renderWithProviders(
    <ManageTagsDialog projectId="p1" open onOpenChange={() => {}} canEdit={role !== 'Viewer'} canDelete={role === 'Admin'} />,
  );
}

describe('ManageTagsDialog', () => {
  beforeEach(() => {
    vi.mocked(listTags).mockResolvedValue(TAGS);
    vi.mocked(updateTag).mockReset();
    vi.mocked(deleteTag).mockReset();
  });

  it('lists every tag with its test case count', async () => {
    renderDialog('Viewer');

    const list = await screen.findByRole('list', { name: 'Project tags' });
    expect(within(list).getAllByRole('listitem').map((row) => row.textContent)).toEqual(['legacy3 test cases · 1 bug', 'smoke1 test case · 0 bugs']);
  });

  it('a Viewer gets no edit or delete controls', async () => {
    renderDialog('Viewer');
    await screen.findByText('legacy');

    expect(screen.queryByLabelText('Name of legacy')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Colour of legacy' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete legacy' })).toBeNull();
  });

  it('a Contributor renames and recolours, and is offered no delete', async () => {
    vi.mocked(updateTag).mockResolvedValue(TAGS[1]);
    renderDialog('Contributor');

    const name = await screen.findByLabelText('Name of smoke');
    fireEvent.change(name, { target: { value: 'smoke suite' } });
    fireEvent.blur(name);
    await waitFor(() => expect(updateTag).toHaveBeenCalledWith(expect.anything(), 'p1', 't-smoke', { name: 'smoke suite' }));

    fireEvent.click(screen.getByRole('button', { name: 'Colour of smoke' }));
    fireEvent.click(await screen.findByRole('radio', { name: 'blue' }));
    await waitFor(() => expect(updateTag).toHaveBeenCalledWith(expect.anything(), 'p1', 't-smoke', { color: 'blue' }));

    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
  });

  it("a refused rename shows the server's reason and restores the name", async () => {
    vi.mocked(updateTag).mockRejectedValue(new ApiError(409, 'a tag with this name already exists', '/x'));
    renderDialog('Contributor');

    const name = await screen.findByLabelText('Name of smoke');
    fireEvent.change(name, { target: { value: 'legacy' } });
    fireEvent.keyDown(name, { key: 'Enter' });

    expect(await screen.findByText('a tag with this name already exists')).toBeTruthy();
    expect((name as HTMLInputElement).value).toBe('smoke');
  });

  it('an Admin deletes only after confirming a message that states the reach', async () => {
    vi.mocked(deleteTag).mockResolvedValue(undefined);
    renderDialog('Admin');

    fireEvent.click(await screen.findByRole('button', { name: 'Delete legacy' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete “legacy”?' });
    expect(within(confirm).getByText(/removed from 3 test cases and 1 bug\./)).toBeTruthy();
    expect(deleteTag).not.toHaveBeenCalled();

    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete tag' }));

    await waitFor(() => expect(deleteTag).toHaveBeenCalledWith(expect.anything(), 'p1', 't-legacy'));
  });
});
