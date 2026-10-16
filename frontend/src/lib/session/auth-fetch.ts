// fetch used by the client of protected routes (design D7): Bearer token, shared renewal, one retry.
import type { Session } from './session'

function withToken(request: Request, token: string | null): Request {
  const authorized = new Request(request)
  if (token) authorized.headers.set('Authorization', `Bearer ${token}`)
  return authorized
}

export function createAuthFetch(session: Session) {
  return async function authFetch(request: Request): Promise<Response> {
    // A new tab or a reload only has the shared refresh token: recover an access token before calling.
    if (!session.getAccessToken() && session.hasSession() && !(await session.renew())) {
      session.expire()
      return fetch(request)
    }

    const retry = request.clone()
    const sentWith = session.getAccessToken()
    const response = await fetch(withToken(request, sentWith))
    if (response.status !== 401) return response
    // Signed out (here or in another tab) while the request was in flight: nothing to renew or expire.
    if (!session.hasSession()) return response

    // Another request of this tab may have renewed while this one was in flight: then just repeat.
    const renewed = session.getAccessToken() !== sentWith || (await session.renew())
    if (!renewed) {
      session.expire()
      return response
    }
    const repeated = await fetch(withToken(retry, session.getAccessToken()))
    if (repeated.status === 401) session.expire()
    return repeated
  }
}
