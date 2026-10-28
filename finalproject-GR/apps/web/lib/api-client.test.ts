import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ApiError, useApiClient } from './api-client';

const getToken = vi.fn();
const push = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('useApiClient', () => {
  beforeEach(() => {
    getToken.mockReset().mockResolvedValue('test-token');
    push.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('attaches the bearer token to every request', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    } as Response);

    const { result } = renderHook(() => useApiClient());
    const data = await result.current.request('/me');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/me'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
    expect(data).toEqual({ hello: 'world' });
  });

  it('redirects to /sign-in and throws on a 401 response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as Response);

    const { result } = renderHook(() => useApiClient());

    await expect(result.current.request('/me')).rejects.toThrow();
    expect(push).toHaveBeenCalledWith('/sign-in');
  });

  it("throws an ApiError carrying the server's message and status", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({ statusCode: 409, message: 'resolve Needs Review runs first', error: 'Conflict' }),
    } as Response);

    const { result } = renderHook(() => useApiClient());
    const error = await result.current.request('/x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, serverMessage: 'resolve Needs Review runs first' });
  });

  it('joins a list of validation messages', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: ['name is required', 'pick a test case'] }),
    } as Response);

    const { result } = renderHook(() => useApiClient());

    await expect(result.current.request('/x')).rejects.toMatchObject({ serverMessage: 'name is required; pick a test case' });
  });

  it('falls back to the raw body when it is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 502, text: async () => 'Bad Gateway' } as Response);

    const { result } = renderHook(() => useApiClient());

    await expect(result.current.request('/x')).rejects.toMatchObject({ status: 502, serverMessage: 'Bad Gateway' });
  });
});
