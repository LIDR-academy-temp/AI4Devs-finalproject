import type { LoginResponse } from '../../features/auth/authSession'
import { setAccessToken } from './accessTokenStore'

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

let refreshPromise: Promise<boolean> | null = null
let onRefreshed: ((data: LoginResponse) => void) | null = null
let onRefreshFailed: (() => void) | null = null

export function setRefreshHandlers(handlers: {
  onRefreshed?: (data: LoginResponse) => void
  onRefreshFailed?: () => void
}): void {
  onRefreshed = handlers.onRefreshed ?? null
  onRefreshFailed = handlers.onRefreshFailed ?? null
}

export async function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = executeRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function executeRefresh(): Promise<boolean> {
  const response = await fetch(`${baseUrl}/SGR/AuthService/RefreshToken`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    onRefreshFailed?.()
    return false
  }
  const data = (await response.json()) as LoginResponse
  if (!data.token) {
    onRefreshFailed?.()
    return false
  }
  setAccessToken(data.token)
  onRefreshed?.(data)
  return true
}
