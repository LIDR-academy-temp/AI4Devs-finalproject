// Browser session (design D1): access token in memory only, refresh token in this tab's sessionStorage.
const REFRESH_KEY = 'recon.refreshToken'

let accessToken: string | null = null
const expireListeners = new Set<() => void>()

function readRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export const session = {
  getAccessToken: (): string | null => accessToken,

  getRefreshToken: readRefreshToken,

  /** A session exists while this tab holds a refresh token; the access token is recovered from it. */
  hasSession: (): boolean => readRefreshToken() !== null,

  setTokens(pair: { accessToken: string; refreshToken: string }) {
    accessToken = pair.accessToken
    sessionStorage.setItem(REFRESH_KEY, pair.refreshToken)
  },

  /** Forgets both tokens. */
  clear() {
    accessToken = null
    sessionStorage.removeItem(REFRESH_KEY)
  },

  /** The session can no longer be renewed: forget it and tell the app (which sends the user to Login). */
  expire() {
    session.clear()
    for (const listener of expireListeners) listener()
  },

  onExpire(listener: () => void): () => void {
    expireListeners.add(listener)
    return () => {
      expireListeners.delete(listener)
    }
  },
}
