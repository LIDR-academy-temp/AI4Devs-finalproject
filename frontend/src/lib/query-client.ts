import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'

/** One automatic retry for network errors and 5xx; never for 4xx (401 is handled by authFetch, 404 is final). */
function retryTransient(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false
  return failureCount < 1
}

export function createQueryClient({ retry }: { retry?: false } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: retry ?? retryTransient, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}
