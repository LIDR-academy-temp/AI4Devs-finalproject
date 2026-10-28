import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ProjectSwitcher, type ProjectSwitcherProps } from './project-switcher';
import { renderWithProviders } from '../../test/render-with-providers';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

const request = vi.fn();
const push = vi.fn();

vi.mock('../../lib/api-client', () => ({
  useApiClient: () => ({ request }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const projects = [
  { id: 'p1', name: 'Checkout Web', slug: 'checkout-web', role: 'Admin' },
  { id: 'p2', name: 'Mobile App', slug: 'mobile-app', role: 'Admin' },
];

function renderSwitcher(props: Partial<ProjectSwitcherProps> = {}) {
  return renderWithProviders(
    <TooltipProvider>
      <SidebarProvider>
        <ProjectSwitcher projectId="p1" projectName="Checkout Web" workspaceName="Acme" isOwner={false} {...props} />
      </SidebarProvider>
    </TooltipProvider>,
  );
}

/** Radix's DropdownMenu opens on pointerdown, not click. */
function openMenu() {
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Switch project' }), {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  });
}

describe('ProjectSwitcher', () => {
  beforeEach(() => {
    request.mockReset();
    push.mockReset();
    request.mockImplementation(async (path: string) => (path === '/projects' ? projects : undefined));
  });

  it('shows the active project and switches to another one, then opens Test Cases', async () => {
    renderSwitcher();
    expect(screen.getByText('Checkout Web')).toBeTruthy();
    openMenu();

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Mobile App' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/test-cases'));
    expect(request).toHaveBeenCalledWith('/me/active-project', {
      method: 'PUT',
      body: JSON.stringify({ projectId: 'p2' }),
    });
  });

  it('offers no New project or Workspace settings to a Collaborator', async () => {
    renderSwitcher();
    openMenu();

    await screen.findByRole('menuitem', { name: 'Mobile App' });
    expect(screen.queryByRole('menuitem', { name: /new project/i })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /workspace settings/i })).toBeNull();
  });

  it('offers both to an Owner, with Workspace settings linking to its screen', async () => {
    renderSwitcher({ isOwner: true });
    openMenu();

    expect(await screen.findByRole('menuitem', { name: /new project/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /workspace settings/i }).getAttribute('href')).toBe('/workspace-settings');
  });
});
