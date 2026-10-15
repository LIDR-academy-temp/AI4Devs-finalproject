// fetch used by the client of protected routes (design D7): Bearer token, single-flight refresh, one retry.
import { session } from './session'

let refreshInFlight: Promise<boolean> | null = null

/** Origin of the API; empty means same origin (the generated paths already carry /api/v1). */
export function apiOrigin(): string {
  return import.meta.env.VITE_API_URL || window.location.origin
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = session.getRefreshToken()
  if (!refreshToken) return false
  const response = await fetch(`${apiOrigin()}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!response.ok) return false
  session.setTokens(await response.json())
  return true
}

/**
 * Renews the token pair. Every caller that arrives while a refresh is running shares it, so the API sees one
 * refresh however many requests failed at once (the refresh token rotates: a second use would be rejected).
 * Resolves false when the API rejects the refresh token; network errors propagate.
 */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

function withToken(request: Request, token: string | null): Request {
  const authorized = new Request(request)
  if (token) authorized.headers.set('Authorization', `Bearer ${token}`)
  return authorized
}

export async function authFetch(request: Request): Promise<Response> {
  // After a reload only the refresh token survives: recover the access token before calling.
  if (!session.getAccessToken() && session.hasSession() && !(await refreshSession())) {
    session.expire()
    return fetch(request)
  }

  const retry = request.clone()
  const sentWith = session.getAccessToken()
  const response = await fetch(withToken(request, sentWith))
  if (response.status !== 401) return response

  // Another request may have refreshed while this one was in flight: then just repeat with the new token.
  const renewed = session.getAccessToken() !== sentWith || (await refreshSession())
  if (!renewed) {
    session.expire()
    return response
  }
  const repeated = await fetch(withToken(retry, session.getAccessToken()))
  if (repeated.status === 401) session.expire()
  return repeated
}
