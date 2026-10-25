import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { TestCaseTree } from './test-case-tree';
import { TestCasesScreen } from './test-cases-screen';
import { listFolders, moveFolder, folderDeleteImpact, renameFolder, type Folder } from '../../lib/folders-api';
import { createTestCase, getTestCase, listTestCases, moveTestCase, type TestCase } from '../../lib/test-cases-api';
import { useSessionContext } from '../../lib/session-context';
import { ApiError } from '../../lib/api-client';
import type { ProjectRole } from '../../lib/test-case-permissions';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/test-cases',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../../lib/session-context', () => ({ useSessionContext: vi.fn() }));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/folders-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/folders-api')>()),
  listFolders: vi.fn(),
  moveFolder: vi.fn(),
  renameFolder: vi.fn(),
  folderDeleteImpact: vi.fn(),
}));
vi.mock('../../lib/test-cases-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/test-cases-api')>()),
  listTestCases: vi.fn(),
  moveTestCase: vi.fn(),
  getTestCase: vi.fn(),
  createTestCase: vi.fn(),
}));

const folder = (id: string, name: string, parentFolderId: string | null, positionKey: string): Folder => ({ id, name, parentFolderId, positionKey });
const tc = (id: string, name: string, folderId: string | null, positionKey: string, extra: Partial<TestCase> = {}): TestCase => ({
  id,
  name,
  folderId,
  positionKey,
  status: 'Ready',
  gherkinScript: null,
  sourceType: 'Manual',
  lastOutcome: null,
  ...extra,
});

// Checkout (c) > Payments (p) > [Pay]; Checkout > [Direct]; root: Login, Signup
const FOLDERS = [folder('c', 'Checkout', null, 'g'), folder('p', 'Payments', 'c', 'i')];
const CASES = [
  tc('login', 'Login', null, 'b', { lastOutcome: 'Fail' }),
  tc('signup', 'Signup', null, 'k'),
  tc('direct', 'Direct', 'c', 'i'),
  tc('pay', 'Pay', 'p', 'i', { status: 'Draft' }),
];

function renderTree(role: ProjectRole = 'Contributor', onAction = vi.fn()) {
  const canCreate = role !== 'Viewer';
  renderWithProviders(
    <TestCaseTree projectId="p1" selected={null} onSelect={() => {}} canCreate={canCreate} canDelete={role === 'Admin'} onAction={onAction} />,
  );
  return { onAction };
}

const rowNames = () => screen.getAllByRole('treeitem').map((row) => row.getAttribute('aria-label'));

describe('TestCaseTree', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(listFolders).mockResolvedValue(FOLDERS);
    vi.mocked(listTestCases).mockResolvedValue(CASES);
    vi.mocked(moveTestCase).mockReset();
    vi.mocked(moveFolder).mockReset();
  });

  it('shows folders before test cases, and an outcome dot only for run test cases', async () => {
    renderTree();

    await screen.findByText('Checkout');
    expect(rowNames()).toEqual(['Folder Checkout', 'Test case Login', 'Test case Signup']);
    expect(screen.getByRole('img', { name: 'Last run: Fail' })).toBeTruthy();
    expect(screen.getAllByRole('img', { name: /Last run/ })).toHaveLength(1);
  });

  it('remembers expanded folders across remounts', async () => {
    renderTree();
    fireEvent.click(await screen.findByRole('button', { name: 'Expand Checkout' }));
    expect(rowNames()).toContain('Folder Payments');

    document.body.innerHTML = '';
    renderTree();

    await waitFor(() => expect(rowNames()).toContain('Folder Payments'));
  });

  it('an empty folder offers no expand control', async () => {
    vi.mocked(listFolders).mockResolvedValue([...FOLDERS, folder('e', 'Empty', null, 'h')]);
    window.localStorage.setItem('test-case-tree:expanded:p1', JSON.stringify(['e']));
    renderTree();

    await screen.findByText('Empty');
    expect(screen.queryByRole('button', { name: /Expand Empty|Collapse Empty/ })).toBeNull();
    expect(screen.getByRole('treeitem', { name: 'Folder Empty' }).getAttribute('aria-expanded')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand Checkout' })).toBeTruthy();
  });

  it('filtering shows a match inside its expanded ancestors', async () => {
    renderTree();
    await screen.findByText('Checkout');

    fireEvent.change(screen.getByLabelText('Filter by name'), { target: { value: 'pay' } });

    expect(rowNames()).toEqual(['Folder Checkout', 'Folder Payments', 'Test case Pay']);
  });

  it('offers a Viewer no actions and no dragging', async () => {
    renderTree('Viewer');
    await screen.findByText('Checkout');

    expect(screen.queryByRole('button', { name: /Actions for/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New folder' })).toBeNull();
    for (const row of screen.getAllByRole('treeitem')) {
      expect(row.getAttribute('aria-disabled')).toBe('true');
    }
  });

  it("a Contributor's menu has Move to… but no Delete", async () => {
    const { onAction } = renderTree('Contributor');
    fireEvent.pointerDown(await screen.findByRole('button', { name: 'Actions for Login' }), { button: 0, pointerType: 'mouse' });

    const menu = await screen.findByRole('menu');
    expect(within(menu).queryByRole('menuitem', { name: /Delete/ })).toBeNull();
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Move to/ }));
    expect(onAction).toHaveBeenCalledWith('move', expect.objectContaining({ id: 'login' }));
  });

  describe('keyboard drag and drop', () => {
    // jsdom has no layout: give each row a 30px slot in tree order so dnd-kit's
    // keyboard sensor can measure where "next" is.
    let rectSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        const rows = [...document.querySelectorAll('[data-row-id]')];
        // The DragOverlay isn't a row: in a browser it starts over the dragged (focused) row.
        const row = this.closest('[data-row-id]') ?? document.activeElement?.closest('[data-row-id]') ?? null;
        const index = row ? rows.indexOf(row) : -1;
        const top = Math.max(index, 0) * 30;
        return { x: 0, y: top, top, left: 0, width: 300, height: 30, right: 300, bottom: top + 30, toJSON: () => ({}) } as DOMRect;
      });
    });
    afterEach(() => rectSpy.mockRestore());

    async function keyboardDrag(rowLabel: string, key: 'ArrowDown' | 'ArrowUp') {
      const row = screen.getByRole('treeitem', { name: rowLabel });
      row.focus();
      // dnd-kit measures and moves asynchronously; let each step settle.
      const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
      await act(async () => {
        fireEvent.keyDown(row, { code: 'Space', key: ' ' });
        await settle();
      });
      await act(async () => {
        fireEvent.keyDown(document.activeElement ?? row, { code: key, key });
        await settle();
      });
      await act(async () => {
        fireEvent.keyDown(document.activeElement ?? row, { code: 'Space', key: ' ' });
        await settle();
      });
    }

    it('picking up, moving and dropping calls the move API', async () => {
      vi.mocked(moveTestCase).mockResolvedValue(CASES[0]);
      renderTree();
      await screen.findByText('Checkout');

      await keyboardDrag('Test case Login', 'ArrowDown');

      await waitFor(() =>
        expect(moveTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', 'login', { folderId: null, afterId: 'signup' }),
      );
    });

    it('rows stay in place while dragging; a drop line shows where it will land', async () => {
      renderTree();
      await screen.findByText('Checkout');
      const row = screen.getByRole('treeitem', { name: 'Test case Login' });
      row.focus();
      const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
      await act(async () => {
        fireEvent.keyDown(row, { code: 'Space', key: ' ' });
        await settle();
      });
      await act(async () => {
        fireEvent.keyDown(document.activeElement ?? row, { code: 'ArrowDown', key: 'ArrowDown' });
        await settle();
      });

      for (const item of screen.getAllByRole('treeitem')) {
        expect(item.style.transform).toBe('');
      }
      expect(screen.getByTestId('drop-line')).toBeTruthy();
      expect(moveTestCase).not.toHaveBeenCalled();
    });

    it('a refused move explains why and leaves the order unchanged', async () => {
      vi.mocked(moveTestCase).mockRejectedValue(new ApiError(409, 'folders can be nested at most 4 levels deep', '/x'));
      renderTree();
      await screen.findByText('Checkout');
      const before = rowNames();

      await keyboardDrag('Test case Login', 'ArrowDown');

      expect((await screen.findByRole('alert')).textContent).toContain('at most 4 levels');
      expect(rowNames()).toEqual(before);
    });
  });
});

describe('Test Cases screen with folders', () => {
  function asRole(role: ProjectRole) {
    vi.mocked(useSessionContext).mockReturnValue({
      data: { workspaceId: 'w1', projectId: 'p1', projectName: 'Project', role },
      loading: false,
      error: null,
    } as ReturnType<typeof useSessionContext>);
  }

  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(listFolders).mockResolvedValue(FOLDERS);
    vi.mocked(listTestCases).mockResolvedValue(CASES);
    vi.mocked(getTestCase).mockImplementation(async (_c, _p, id) => CASES.find((t) => t.id === id)!);
  });

  it('a selected folder shows its breadcrumb and counts', async () => {
    asRole('Viewer');
    renderWithProviders(<TestCasesScreen />);

    fireEvent.click(await screen.findByText('Checkout'));

    const counts = await screen.findByLabelText('Folder contents');
    expect(counts.textContent).toContain('Subfolders1');
    expect(counts.textContent).toContain('Test cases here1');
    expect(counts.textContent).toContain('Test cases in total2');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain('Checkout');
  });

  it('a test case shows its folder path', async () => {
    asRole('Viewer');
    renderWithProviders(<TestCasesScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Expand Checkout' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Expand Payments' }));

    fireEvent.click(await screen.findByText('Pay'));

    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toBe('CheckoutPayments'));
  });

  it('a new test case defaults to the selected folder, then opens selected', async () => {
    asRole('Contributor');
    vi.mocked(createTestCase).mockResolvedValue(tc('new', 'New one', 'c', 'z'));
    renderWithProviders(<TestCasesScreen />);

    fireEvent.click(await screen.findByText('Checkout'));
    fireEvent.click(screen.getByRole('button', { name: 'New test case' }));
    fireEvent.change(await screen.findByLabelText('New test case name'), { target: { value: 'New one' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(createTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', expect.objectContaining({ name: 'New one', folderId: 'c' })),
    );
    await waitFor(() => expect(getTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', 'new'));
  });

  it('Move to… moves the item to the picked folder', async () => {
    asRole('Contributor');
    vi.mocked(moveTestCase).mockResolvedValue(CASES[0]);
    renderWithProviders(<TestCasesScreen />);

    fireEvent.pointerDown(await screen.findByRole('button', { name: 'Actions for Login' }), { button: 0, pointerType: 'mouse' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Move to/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/Payments/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move here' }));

    await waitFor(() =>
      expect(moveTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', 'login', { folderId: 'p', afterId: 'pay' }),
    );
  });

  it('renaming to a duplicate shows the reason', async () => {
    asRole('Contributor');
    vi.mocked(renameFolder).mockRejectedValue(new ApiError(409, 'a folder with this name already exists here', '/x'));
    renderWithProviders(<TestCasesScreen />);

    fireEvent.pointerDown(await screen.findByRole('button', { name: 'Actions for Checkout' }), { button: 0, pointerType: 'mouse' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Rename/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Folder name'), { target: { value: 'Payments' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rename' }));

    expect((await within(dialog).findByRole('alert')).textContent).toContain('already exists');
  });

  it('deleting a folder confirms how many folders and test cases go with it', async () => {
    asRole('Admin');
    vi.mocked(folderDeleteImpact).mockResolvedValue({ folders: 2, testCases: 3 });
    renderWithProviders(<TestCasesScreen />);

    fireEvent.pointerDown(await screen.findByRole('button', { name: 'Actions for Checkout' }), { button: 0, pointerType: 'mouse' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.textContent).toContain('2 folders and 3 test cases will be deleted.'));
  });
});
