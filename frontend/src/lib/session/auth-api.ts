// Login, identity and logout against /api/v1/auth (openspec/specs/auth).
import type { LoginRequest } from '@recon/shared'
import { api, publicApi, unwrap } from '@/lib/api/client'
import type { Me } from '@/lib/api/types'
import { type Session, session as tabSession } from './session'

/** Logs in and shares the session with the other tabs. */
export async function login(credentials: LoginRequest, session: Session = tabSession): Promise<void> {
  session.signIn(await unwrap(publicApi.POST('/api/v1/auth/login', { body: credentials })))
}

export function fetchMe(): Promise<Me> {
  return unwrap(api.GET('/api/v1/auth/me'))
}

/** Revokes the refresh token on the API if it can; the session is forgotten in every tab either way. */
export async function logout(session: Session = tabSession): Promise<void> {
  const refreshToken = session.getRefreshToken()
  session.signOut()
  if (!refreshToken) return
  try {
    await publicApi.POST('/api/v1/auth/logout', { body: { refreshToken } })
  } catch {
    // Unreachable API: the token expires on its own; the user is signed out locally regardless.
  }
}
