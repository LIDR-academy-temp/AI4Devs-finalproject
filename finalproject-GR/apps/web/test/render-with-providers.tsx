import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';

function newTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/** A fresh QueryClientProvider wrapper component, for renderHook's `wrapper` option. */
export function createQueryWrapper(): { Wrapper: (props: { children: ReactNode }) => ReactElement; queryClient: QueryClient } {
  const queryClient = newTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, queryClient };
}

/**
 * Wraps RTL's render in a fresh QueryClient per call (never shared across
 * tests) with retries disabled, so a failing query/mutation in a test fails
 * fast instead of retrying and slowing the suite down.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const { Wrapper, queryClient } = createQueryWrapper();
  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient };
}
