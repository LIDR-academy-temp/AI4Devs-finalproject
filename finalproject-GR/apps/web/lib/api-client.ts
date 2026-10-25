'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ApiClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

/**
 * A non-2xx API response. `serverMessage` is the reason the API gave (Nest's JSON
 * `message`, joined if it's a list), so screens can show *why* an action was refused.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly serverMessage: string,
    path: string,
  ) {
    super(`API request to ${path} failed: ${status} ${serverMessage}`);
    this.name = 'ApiError';
  }
}

function messageFromBody(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
    if (Array.isArray(parsed.message)) {
      return parsed.message.join('; ');
    }
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return body;
}

/**
 * The single shared API client (ADR 0009: "not scattered per call site"). Attaches
 * the Clerk session token as a bearer token to every request; redirects to /sign-in
 * on 401, since that means the session the client thought it had is no longer valid.
 */
export function useApiClient(): ApiClient {
  const { getToken } = useAuth();
  const router = useRouter();

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
          ...(init.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${token}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });

      if (response.status === 401) {
        router.push('/sign-in');
        throw new Error('Session expired');
      }

      if (!response.ok) {
        const body = await response.text();
        throw new ApiError(response.status, messageFromBody(body), path);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    },
    [getToken, router],
  );

  return { request };
}
