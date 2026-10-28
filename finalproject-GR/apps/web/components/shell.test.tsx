import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Shell } from './shell';
import { useSessionContext } from '../lib/session-context';
import type { UseSessionResult } from '../lib/use-session';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('../lib/session-context', () => ({
  useSessionContext: vi.fn(),
}));
const pathname = vi.fn(() => '/test-cases');
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
}));
vi.mock('./user-menu', () => ({
  UserMenu: () => <button type="button">User menu</button>,
}));
// The switcher fetches its project list; its own test covers it (project-switcher.test.tsx).
vi.mock('./projects/project-switcher', () => ({
  ProjectSwitcher: ({ projectName, isOwner }: { projectName: string; isOwner: boolean }) => (
    <button type="button" data-owner={String(isOwner)}>
      Switch project: {projectName}
    </button>
  ),
}));

const mockedUseSessionContext = useSessionContext as unknown as ReturnType<typeof vi.fn>;

function mockSession(result: Partial<UseSessionResult>) {
  mockedUseSessionContext.mockReturnValue({ data: null, loading: false, error: null, ...result });
}

const viewer = {
  workspaceId: 'w1',
  workspaceName: 'Acme',
  workspaceRole: 'Collaborator' as const,
  projectId: 'p1',
  projectName: 'Project',
  projectSlug: 'project',
  role: 'Viewer' as const,
};

/** The root layout provides TooltipProvider; tests supply it the same way. */
function renderShell(props: { defaultOpen?: boolean } = {}) {
  return render(
    <TooltipProvider>
      <Shell {...props}>
        <div>content</div>
      </Shell>
    </TooltipProvider>,
  );
}

describe('Shell', () => {
  beforeEach(() => {
    pathname.mockReturnValue('/test-cases');
    document.cookie = 'sidebar_state=; max-age=0; path=/';
  });

  it('shows the project switcher with the project name, telling it whether the user is Owner', () => {
    mockSession({ data: { ...viewer, workspaceRole: 'Owner' } });
    renderShell();

    const switcher = screen.getByRole('button', { name: 'Switch project: Project' });
    expect(switcher.getAttribute('data-owner')).toBe('true');
  });

  it('offers Project Settings, with an icon, to Admins only', () => {
    mockSession({ data: { ...viewer, role: 'Admin' } });
    const { unmount } = renderShell();
    expect(screen.getByRole('link', { name: 'Project Settings' }).querySelector('svg')).not.toBeNull();
    unmount();

    for (const role of ['Viewer', 'Contributor'] as const) {
      mockSession({ data: { ...viewer, role } });
      const view = renderShell();
      expect(screen.queryByRole('link', { name: 'Project Settings' })).toBeNull();
      view.unmount();
    }
  });

  it('shows the access-denied state when role resolves to null', () => {
    mockSession({ data: { ...viewer, role: null } });
    renderShell();

    expect(screen.getByRole('alert').textContent).toMatch(/access denied/i);
    expect(screen.queryByText('Test Cases')).toBeNull();
    expect(screen.queryByText('content')).toBeNull();
  });

  it('shows the sidebar, the project name, the user menu and children when a role is present', () => {
    mockSession({ data: viewer });
    renderShell();

    expect(screen.getByRole('link', { name: 'Test Cases' })).toBeTruthy();
    expect(screen.getAllByText('Project').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'User menu' })).toBeTruthy();
    expect(screen.getByText('content')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('gives every nav item an icon and marks the current screen', () => {
    pathname.mockReturnValue('/executions');
    mockSession({ data: viewer });
    renderShell();

    for (const name of ['Test Cases', 'Executions', 'Bugs']) {
      const link = screen.getByRole('link', { name });
      expect(link.querySelector('svg')).not.toBeNull();
    }
    expect(screen.getByRole('link', { name: 'Executions' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Test Cases' }).getAttribute('aria-current')).toBeNull();
  });

  it('marks Bugs as current on the Bugs screen', () => {
    pathname.mockReturnValue('/bugs');
    mockSession({ data: viewer });
    renderShell();

    const bugs = screen.getByRole('link', { name: 'Bugs' });
    expect(bugs.getAttribute('href')).toBe('/bugs');
    expect(bugs.getAttribute('aria-current')).toBe('page');
  });

  it('collapses to the icon rail, remembering the choice in the sidebar_state cookie', () => {
    mockSession({ data: viewer });
    const { container } = renderShell();
    const sidebar = () => container.querySelector('[data-slot="sidebar"][data-state]')!;

    expect(sidebar().getAttribute('data-state')).toBe('expanded');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));

    expect(sidebar().getAttribute('data-state')).toBe('collapsed');
    expect(sidebar().getAttribute('data-collapsible')).toBe('icon');
    expect(document.cookie).toContain('sidebar_state=false');
  });

  it('starts collapsed when the remembered state says so', () => {
    mockSession({ data: viewer });
    const { container } = renderShell({ defaultOpen: false });

    expect(container.querySelector('[data-slot="sidebar"][data-state]')!.getAttribute('data-state')).toBe('collapsed');
  });
});
