import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ProjectSettingsScreen } from './project-settings-screen';
import { renderWithProviders } from '../../test/render-with-providers';
import { ApiError } from '../../lib/api-client';
import { useSessionContext } from '../../lib/session-context';

const request = vi.fn();

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request }),
}));
vi.mock('../../lib/session-context', () => ({ useSessionContext: vi.fn() }));
vi.mock('../../lib/notify', () => ({ notifySuccess: vi.fn() }));

const mockedSession = useSessionContext as unknown as ReturnType<typeof vi.fn>;

function mockRole(role: 'Admin' | 'Contributor') {
  mockedSession.mockReturnValue({
    loading: false,
    error: null,
    data: {
      workspaceId: 'w1',
      workspaceName: 'Acme',
      workspaceRole: 'Collaborator',
      projectId: 'p1',
      projectName: 'Checkout Web',
      projectSlug: 'checkout-web',
      role,
    },
  });
}

describe('ProjectSettingsScreen', () => {
  beforeEach(() => {
    request.mockReset();
  });

  it('lets an Admin rename the project and refreshes the project list and the session project', async () => {
    mockRole('Admin');
    request.mockResolvedValue({ id: 'p1', name: 'Checkout', slug: 'checkout-web', role: 'Admin' });
    const { queryClient } = renderWithProviders(<ProjectSettingsScreen />);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    expect(screen.getByLabelText('Project slug').textContent).toBe('checkout-web');
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Checkout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['projects', 'p1'], exact: true }),
    );
    expect(request).toHaveBeenCalledWith('/projects/p1', { method: 'PATCH', body: JSON.stringify({ name: 'Checkout' }) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['projects'], exact: true });
  });

  it("shows the server's reason inline when the rename is refused", async () => {
    mockRole('Admin');
    request.mockRejectedValue(new ApiError(400, 'name must be 1 to 100 characters', '/projects/p1'));
    renderWithProviders(<ProjectSettingsScreen />);

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Checkout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('name must be 1 to 100 characters')).toBeTruthy();
  });

  it('refuses a blank name before sending anything', async () => {
    mockRole('Admin');
    renderWithProviders(<ProjectSettingsScreen />);

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Name must be 1 to 100 characters')).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });

  it('shows access denied to a Contributor', () => {
    mockRole('Contributor');
    renderWithProviders(<ProjectSettingsScreen />);

    expect(screen.getByRole('alert').textContent).toMatch(/access denied/i);
    expect(screen.queryByLabelText('Project name')).toBeNull();
  });
});
