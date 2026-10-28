import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { ExecutionTestCasePicker } from './execution-test-case-picker';
import { listFolders, type Folder } from '../../lib/folders-api';
import { listTestCases, type TestCase } from '../../lib/test-cases-api';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/folders-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/folders-api')>()),
  listFolders: vi.fn(),
}));
vi.mock('../../lib/test-cases-api', () => ({ listTestCases: vi.fn() }));

const folder = (id: string, name: string, parentFolderId: string | null, positionKey: string): Folder => ({ id, name, parentFolderId, positionKey });
const tc = (id: string, name: string, folderId: string | null, positionKey: string, status: TestCase['status'] = 'Ready'): TestCase => ({
  id,
  name,
  folderId,
  positionKey,
  status,
  gherkinScript: null,
  sourceType: 'Manual',
  lastOutcome: null,
});

// Checkout (c) > [Payments (p) > Pay by card, Wallet (Draft)], Checkout > Direct; root: Login
const FOLDERS = [folder('c', 'Checkout', null, 'g'), folder('p', 'Payments', 'c', 'i')];
const CASES = [
  tc('login', 'Login', null, 'b'),
  tc('direct', 'Direct', 'c', 'i'),
  tc('card', 'Pay by card', 'p', 'i'),
  tc('wallet', 'Wallet', 'p', 'k', 'Draft'),
];

/** Holds the selection like the form does, and exposes it for assertions. */
function Harness({ initial = [] as string[], onChange = vi.fn() }) {
  const [selected, setSelected] = useState(initial);
  return (
    <>
      <ExecutionTestCasePicker
        projectId="p1"
        selected={selected}
        onChange={(ids) => {
          setSelected(ids);
          onChange(ids);
        }}
      />
      <output data-testid="selected">{selected.join(',')}</output>
    </>
  );
}

const selectedIds = () => screen.getByTestId('selected').textContent;

describe('ExecutionTestCasePicker', () => {
  beforeEach(() => {
    vi.mocked(listFolders).mockResolvedValue(FOLDERS);
    vi.mocked(listTestCases).mockResolvedValue(CASES);
  });

  it('shows the folder tree, folders first, and opens folders on demand', async () => {
    renderWithProviders(<Harness />);

    const items = await screen.findAllByRole('treeitem');
    expect(items.map((item) => item.textContent)).toEqual(['Checkout', 'Login']);

    fireEvent.click(screen.getByRole('button', { name: 'Expand Checkout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expand Payments' }));
    fireEvent.click(screen.getByLabelText('Pay by card'));

    expect(selectedIds()).toBe('card');
  });

  it('clicking anywhere on a row (name or icon) toggles it', async () => {
    renderWithProviders(<Harness />);
    const login = (await screen.findByLabelText('Login')).closest('[role="treeitem"]') as HTMLElement;

    fireEvent.click(within(login).getByText('Login'));
    expect(selectedIds()).toBe('login');
    fireEvent.click(login.querySelector('label svg:not([class*="lucide-check"]):not([class*="lucide-minus"])') as Element);
    expect(selectedIds()).toBe('');
  });

  it('a folder with no Ready test case is disabled and says why', async () => {
    vi.mocked(listFolders).mockResolvedValue([...FOLDERS, folder('e', 'Empty', null, 'z')]);
    renderWithProviders(<Harness />);

    const empty = await screen.findByLabelText('Empty');
    expect((empty as HTMLButtonElement).disabled).toBe(true);
    expect(within(empty.closest('[role="treeitem"]') as HTMLElement).getByText('No Ready test cases')).toBeTruthy();
  });

  it('labels a Draft test case and does not let it be checked', async () => {
    renderWithProviders(<Harness initial={['card']} />);

    // Ancestors of a selected test case start expanded.
    const wallet = await screen.findByLabelText('Wallet');
    expect(screen.getByText('Draft')).toBeTruthy();
    expect((wallet as HTMLButtonElement).disabled).toBe(true);
  });

  it('checking a folder picks its nested Ready test cases in tree order', async () => {
    renderWithProviders(<Harness initial={['login']} />);

    fireEvent.click(await screen.findByLabelText('Checkout'));

    expect(selectedIds()).toBe('login,card,direct');
    expect(screen.getByLabelText('Checkout').getAttribute('data-state')).toBe('checked');
  });

  it('a partly selected folder shows as indeterminate, and unchecking a full one clears it', async () => {
    renderWithProviders(<Harness initial={['direct']} />);

    const checkout = await screen.findByLabelText('Checkout');
    expect(checkout.getAttribute('data-state')).toBe('indeterminate');

    fireEvent.click(checkout);
    expect(selectedIds()).toBe('direct,card');
    fireEvent.click(checkout);
    expect(selectedIds()).toBe('');
  });

  it('filtering shows only matching test cases and the folders above them', async () => {
    renderWithProviders(<Harness />);
    await screen.findByLabelText('Checkout');

    fireEvent.change(screen.getByLabelText('Filter test cases'), { target: { value: 'card' } });

    expect(screen.getAllByRole('treeitem').map((item) => item.textContent)).toEqual(['Checkout', 'Payments', 'Pay by card']);
  });
});
