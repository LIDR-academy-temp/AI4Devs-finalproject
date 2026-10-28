import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { WorkspaceSettingsScreen } from './workspace-settings-screen';
import { renderWithProviders } from '../../test/render-with-providers';
import { useSessionContext } from '../../lib/session-context';
import type { WorkspaceProjects } from '../../lib/workspace-api';

const request = vi.fn();
const push = vi.fn();

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request }),
}));
vi.mock('../../lib/session-context', () => ({ useSessionContext: vi.fn() }));
vi.mock('../../lib/notify', () => ({ notifySuccess: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockedSession = useSessionContext as unknown as ReturnType<typeof vi.fn>;

function mockWorkspaceRole(workspaceRole: 'Owner' | 'Collaborator') {
  mockedSession.mockReturnValue({
    loading: false,
    error: null,
    data: {
      workspaceId: 'w1',
      workspaceName: 'Acme',
      workspaceRole,
      projectId: 'p1',
      projectName: 'Checkout Web',
      projectSlug: 'checkout-web',
      role: 'Admin',
    },
  });
}

const checkout = { id: 'p1', name: 'Checkout Web', slug: 'checkout-web', testCaseCount: 12, executionCount: 3 };
const old = { id: 'p2', name: 'Old App', slug: 'old-app', testCaseCount: 4, executionCount: 1 };

/** A tiny in-memory API: /workspace/projects reflects deletes and restores. */
function serve(initial: WorkspaceProjects) {
  let state = structuredClone(initial);
  request.mockImplementation(async (path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (path === '/workspace/projects') {
      return state;
    }
    if (path === '/workspace' && method === 'PATCH') {
      return { id: 'w1', ...JSON.parse(String(init!.body)), role: 'Owner' };
    }
    const deleteMatch = path.match(/^\/projects\/(\w+)$/);
    if (deleteMatch && method === 'DELETE') {
      const project = state.projects.find((p) => p.id === deleteMatch[1])!;
      state = {
        projects: state.projects.filter((p) => p !== project),
        deleted: [
          ...state.deleted,
          {
            id: project.id,
            name: project.name,
            deletedAt: new Date().toISOString(),
            deletedBy: { id: 'u1', displayName: 'Olivia' },
            daysLeft: 30,
          },
        ],
      };
      return undefined;
    }
    const restoreMatch = path.match(/^\/projects\/(\w+)\/restore$/);
    if (restoreMatch) {
      const project = state.deleted.find((p) => p.id === restoreMatch[1])!;
      state = {
        projects: [...state.projects, { ...old, id: project.id, name: project.name }],
        deleted: state.deleted.filter((p) => p !== project),
      };
      return { id: project.id, name: project.name, slug: 'old-app', role: 'Admin' };
    }
    return undefined;
  });
}

const projectsTable = () => screen.getByRole('table');

describe('WorkspaceSettingsScreen', () => {
  beforeEach(() => {
    request.mockReset();
    push.mockReset();
    mockWorkspaceRole('Owner');
  });

  it('renames the workspace', async () => {
    serve({ projects: [checkout], deleted: [] });
    renderWithProviders(<WorkspaceSettingsScreen />);

    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Acme QA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('/workspace', { method: 'PATCH', body: JSON.stringify({ name: 'Acme QA' }) }),
    );
  });

  it('lists projects with their counts, and opens one project\'s settings by switching to it', async () => {
    serve({ projects: [checkout, old], deleted: [] });
    renderWithProviders(<WorkspaceSettingsScreen />);

    const row = (await screen.findByText('Old App')).closest('tr')!;
    expect(within(row).getByText('4')).toBeTruthy();
    expect(within(row).getByText('1')).toBeTruthy();

    fireEvent.click(within(row).getByRole('button', { name: 'Settings for Old App' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/settings'));
    expect(request).toHaveBeenCalledWith('/me/active-project', { method: 'PUT', body: JSON.stringify({ projectId: 'p2' }) });
  });

  it('deletes after confirmation, moving the project to Recently deleted, then restores it', async () => {
    serve({ projects: [checkout, old], deleted: [] });
    renderWithProviders(<WorkspaceSettingsScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Old App' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toMatch(/move to the trash/i);
    expect(dialog.textContent).toMatch(/30 days/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete project' }));

    const restore = await screen.findByRole('button', { name: 'Restore Old App' });
    expect(within(projectsTable()).queryByText('Old App')).toBeNull();
    expect(screen.getByText(/Deleted by Olivia/)).toBeTruthy();
    expect(screen.getByText(/30 days left/)).toBeTruthy();

    fireEvent.click(restore);

    await waitFor(() => expect(within(projectsTable()).getByText('Old App')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Restore Old App' })).toBeNull();
  });

  it('disables Delete on the only live project and says why', async () => {
    serve({ projects: [checkout], deleted: [] });
    renderWithProviders(<WorkspaceSettingsScreen />);

    const button = await screen.findByRole('button', { name: 'Delete Checkout Web' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/last project can.t be deleted/i)).toBeTruthy();
  });

  it('shows access denied to a Collaborator, without loading projects', () => {
    mockWorkspaceRole('Collaborator');
    renderWithProviders(<WorkspaceSettingsScreen />);

    expect(screen.getByRole('alert').textContent).toMatch(/access denied/i);
    expect(request).not.toHaveBeenCalled();
  });
});
