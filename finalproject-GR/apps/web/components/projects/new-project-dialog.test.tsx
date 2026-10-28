import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { NewProjectDialog } from './new-project-dialog';
import { renderWithProviders } from '../../test/render-with-providers';

const request = vi.fn();
const push = vi.fn();

vi.mock('../../lib/api-client', () => ({
  useApiClient: () => ({ request }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
vi.mock('../../lib/notify', () => ({ notifySuccess: vi.fn() }));

describe('NewProjectDialog', () => {
  beforeEach(() => {
    request.mockReset();
    push.mockReset();
  });

  it('shows an error for a blank name and sends nothing', async () => {
    renderWithProviders(<NewProjectDialog open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(await screen.findByText('Name is required')).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });

  it('creates the project, then makes it active and closes', async () => {
    const onOpenChange = vi.fn();
    request.mockImplementation(async (path: string) =>
      path === '/projects' ? { id: 'p9', name: 'Mobile App', slug: 'mobile-app', role: 'Admin' } : undefined,
    );
    renderWithProviders(<NewProjectDialog open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Mobile App' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(request.mock.calls.map(([path, init]) => [path, init?.method])).toEqual([
      ['/projects', 'POST'],
      ['/me/active-project', 'PUT'],
    ]);
    expect(request.mock.calls[1][1].body).toBe(JSON.stringify({ projectId: 'p9' }));
    expect(push).toHaveBeenCalledWith('/test-cases');
  });
});
