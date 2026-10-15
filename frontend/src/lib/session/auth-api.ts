// Login, identity and logout against /api/v1/auth (openspec/specs/auth).
import type { LoginRequest } from '@recon/shared'
import { api, publicApi, unwrap } from '@/lib/api/client'
import type { Me } from '@/lib/api/types'
import { session } from './session'

export async function login(credentials: LoginRequest): Promise<void> {
  session.setTokens(await unwrap(publicApi.POST('/api/v1/auth/login', { body: credentials })))
}

export function fetchMe(): Promise<Me> {
  return unwrap(api.GET('/api/v1/auth/me'))
}

/** Revokes the refresh token on the API if it can; the local session is forgotten either way. */
export async function logout(): Promise<void> {
  const refreshToken = session.getRefreshToken()
  session.clear()
  if (!refreshToken) return
  try {
    await publicApi.POST('/api/v1/auth/logout', { body: { refreshToken } })
  } catch {
    // Unreachable API: the token expires on its own; the user is signed out locally regardless.
  }
}
