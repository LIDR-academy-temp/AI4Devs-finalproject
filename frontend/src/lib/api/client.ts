// Typed API clients generated from docs/openapi.yaml (design D6).
import createClient from 'openapi-fetch'
import { apiOrigin } from '@/lib/session/api-origin'
import { createAuthFetch } from '@/lib/session/auth-fetch'
import { type Session, session } from '@/lib/session/session'
import type { paths } from './schema.gen'

/** Client of protected routes for a session: Bearer token, transparent renewal and session expiry. */
export function createApi(owner: Session) {
  return createClient<paths>({ baseUrl: apiOrigin(), fetch: createAuthFetch(owner) })
}

/** Protected routes of this tab. */
export const api = createApi(session)

/**
 * Login, refresh and logout: never go through the refresh logic. `fetch` is looked up on each call, not captured
 * when the client is created, so that whatever wraps the global fetch later (tests, instrumentation) applies.
 */
export const publicApi = createClient<paths>({ baseUrl: apiOrigin(), fetch: (request) => fetch(request) })

/** Non-2xx answer of the API with its uniform error body (README §4). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
    /** `details` of the error body as the API sent it (e.g. `duplicate_file` names the file already included). */
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface FetchResult<T> {
  data?: T
  error?: unknown
  response: Response
}

/** Returns the body of a 2xx answer or throws ApiError. Network failures propagate as they are. */
export async function unwrap<T>(call: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await call
  if (response.ok) return data as T
  const body = (error ?? {}) as { code?: string; message?: string; details?: unknown }
  throw new ApiError(response.status, body.code, body.message ?? `HTTP ${response.status}`, body.details)
}
