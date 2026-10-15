// Browser session (design D1): access token in this tab's memory only; refresh token in localStorage, shared by
// every tab. Renewals are serialised across tabs with Web Locks; login and logout are announced on a BroadcastChannel.
import { apiOrigin } from './api-origin'

const REFRESH_KEY = 'recon.refreshToken'
const RENEW_LOCK = 'recon.refresh'
const CHANNEL = 'recon.session'

type SessionMessage = { type: 'login' } | { type: 'logout' }

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface SessionOptions {
  /** Shared by the tabs; `localStorage` in the browser. */
  storage?: Storage
  /** Origin-wide lock manager; `navigator.locks` in the browser (looked up on use). */
  locks?: () => Pick<LockManager, 'request'>
}

export type Session = ReturnType<typeof createSession>

export function createSession({ storage = localStorage, locks = () => navigator.locks }: SessionOptions = {}) {
  let accessToken: string | null = null
  let renewInFlight: Promise<boolean> | null = null
  const listeners = { expire: new Set<() => void>(), login: new Set<() => void>(), logout: new Set<() => void>() }
  const channel = new BroadcastChannel(CHANNEL)

  const notify = (event: keyof typeof listeners) => {
    for (const listener of listeners[event]) listener()
  }
  const subscribe = (event: keyof typeof listeners, listener: () => void) => {
    listeners[event].add(listener)
    return () => {
      listeners[event].delete(listener)
    }
  }
  const announce = (message: SessionMessage) => channel.postMessage(message)

  channel.onmessage = (event: MessageEvent<SessionMessage>) => {
    if (event.data.type === 'logout') {
      // The other tab already removed the shared refresh token and revoked it on the API.
      accessToken = null
      notify('logout')
    } else if (event.data.type === 'login') {
      notify('login')
    }
  }

  const readRefreshToken = (): string | null => storage.getItem(REFRESH_KEY)

  /** One renewal at a time across every tab, each with the refresh token current when its turn comes. */
  async function renewUnderLock(): Promise<boolean> {
    return locks().request(RENEW_LOCK, async () => {
      // Re-read inside the lock: another tab may have rotated the token while this one waited.
      const refreshToken = readRefreshToken()
      if (!refreshToken) return false
      const response = await fetch(`${apiOrigin()}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!response.ok) return false
      session.setTokens((await response.json()) as TokenPair)
      return true
    })
  }

  const session = {
    getAccessToken: (): string | null => accessToken,

    getRefreshToken: readRefreshToken,

    /** A session exists while the browser holds a refresh token; each tab recovers its access token from it. */
    hasSession: (): boolean => readRefreshToken() !== null,

    setTokens(pair: TokenPair) {
      accessToken = pair.accessToken
      storage.setItem(REFRESH_KEY, pair.refreshToken)
    },

    /** Stores a pair obtained by logging in and tells the other tabs. */
    signIn(pair: TokenPair) {
      session.setTokens(pair)
      announce({ type: 'login' })
    },

    /** Forgets the session in this tab and in the shared storage, and tells the other tabs. */
    signOut() {
      session.clear()
      announce({ type: 'logout' })
    },

    /** Forgets both tokens (this tab's access token and the shared refresh token). */
    clear() {
      accessToken = null
      storage.removeItem(REFRESH_KEY)
    },

    /**
     * Renews the token pair. Requests of this tab that fail together share one renewal; tabs take turns through
     * the lock. Resolves false when there is no refresh token or the API rejects it; network errors propagate.
     */
    renew(): Promise<boolean> {
      renewInFlight ??= renewUnderLock().finally(() => {
        renewInFlight = null
      })
      return renewInFlight
    },

    /** The session can no longer be renewed: forget it and tell this tab's app (which sends the user to Login). */
    expire() {
      session.clear()
      notify('expire')
    },

    onExpire: (listener: () => void) => subscribe('expire', listener),
    /** Another tab signed in. */
    onLogin: (listener: () => void) => subscribe('login', listener),
    /** Another tab signed out; this tab's access token is already forgotten. */
    onLogout: (listener: () => void) => subscribe('logout', listener),

    /** Stops listening to the other tabs (tests and teardown). */
    close() {
      channel.close()
    },
  }
  return session
}

/** The session of this tab. */
export const session = createSession()
