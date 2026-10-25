import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSession } from './use-session';
import { createQueryWrapper } from '../test/render-with-providers';

const request = vi.fn();

vi.mock('./api-client', () => ({
  useApiClient: () => ({ request }),
}));

describe('useSession', () => {
  beforeEach(() => {
    request.mockReset();
  });

  it('resolves workspaceId, projectId, and role from /me and /projects/:id', async () => {
    request.mockImplementation(async (path: string) => {
      if (path === '/me') {
        return { id: 'u1', displayName: 'A', email: 'a@example.com', workspaceId: 'w1', projectId: 'p1' };
      }
      if (path === '/projects/p1') {
        return { id: 'p1', name: 'Project', slug: 'project', role: 'Contributor' };
      }
      throw new Error(`unexpected path ${path}`);
    });

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSession(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({
      workspaceId: 'w1',
      projectId: 'p1',
      projectName: 'Project',
      role: 'Contributor',
    });
    expect(result.current.error).toBeNull();
  });

  it('resolves role: null when the project response carries no role', async () => {
    request.mockImplementation(async (path: string) => {
      if (path === '/me') {
        return { id: 'u1', displayName: 'A', email: 'a@example.com', workspaceId: 'w1', projectId: 'p1' };
      }
      return { id: 'p1', name: 'Project', slug: 'project' };
    });

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSession(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.role).toBeNull();
  });
});
