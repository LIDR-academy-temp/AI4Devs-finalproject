import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, api, unwrap } from '@/lib/api/client'
import { PASSWORD } from '@/test/msw/fixtures'
import { db, issueTokens } from '@/test/msw/handlers'
import { recordRequests } from '@/test/msw/record'
import { server } from '@/test/msw/server'
import { login, logout } from './auth-api'
import { session } from './session'

const MERCHANTS = 'GET /api/v1/merchants'
const REFRESH = 'POST /api/v1/auth/refresh'

/** A session whose access token the API no longer accepts but whose refresh token is still valid. */
function staleSession() {
  const pair = issueTokens('viewer')
  db.accessTokens.delete(pair.accessToken)
  session.setTokens(pair)
  return pair
}

function onExpire() {
  const listener = vi.fn()
  const off = session.onExpire(listener)
  return { listener, off }
}

describe('authenticated requests', () => {
  it('send the access token as a Bearer token', async () => {
    session.setTokens(issueTokens('viewer'))

    const merchants = await unwrap(api.GET('/api/v1/merchants'))

    expect(merchants.map((m) => m.name)).toEqual(['Merchant A'])
  })

  it('refresh the pair once on 401 and repeat the request with the new access token', async () => {
    const rec = recordRequests()
    const stale = staleSession()

    const merchants = await unwrap(api.GET('/api/v1/merchants'))

    expect(merchants).toHaveLength(1)
    expect(rec.count(REFRESH)).toBe(1)
    expect(rec.count(MERCHANTS)).toBe(2)
    expect(session.getAccessToken()).not.toBe(stale.accessToken)
    expect(session.getRefreshToken()).not.toBe(stale.refreshToken)
  })

  it('share a single refresh between requests that fail at the same time', async () => {
    const rec = recordRequests()
    staleSession()

    const results = await Promise.all([
      unwrap(api.GET('/api/v1/merchants')),
      unwrap(api.GET('/api/v1/channels', { params: { query: { unassigned: 'true' } } })),
      unwrap(api.GET('/api/v1/providers/{providerId}', { params: { path: { providerId: '101' } } })),
    ])

    expect(results).toHaveLength(3)
    expect(rec.count(REFRESH)).toBe(1)
  })

  it('refresh before the first request when only the refresh token survived a reload', async () => {
    const rec = recordRequests()
    const pair = issueTokens('viewer')
    localStorage.setItem('recon.refreshToken', pair.refreshToken)

    await unwrap(api.GET('/api/v1/merchants'))

    expect(rec.calls).toEqual([REFRESH, MERCHANTS])
  })
})

describe('session expiry', () => {
  it('expires the session once and forgets the tokens when the refresh token is rejected', async () => {
    const { listener, off } = onExpire()
    const pair = issueTokens('viewer')
    db.accessTokens.delete(pair.accessToken)
    db.refreshTokens.delete(pair.refreshToken)
    session.setTokens(pair)

    await expect(unwrap(api.GET('/api/v1/merchants'))).rejects.toMatchObject({ status: 401 })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(session.getAccessToken()).toBeNull()
    expect(session.getRefreshToken()).toBeNull()
    expect(localStorage.length).toBe(0)
    off()
  })

  it('does not refresh again when the repeated request also gets 401 (no loop)', async () => {
    const rec = recordRequests()
    const { listener, off } = onExpire()
    server.use(http.get('*/api/v1/merchants', () => HttpResponse.json({ code: 'unauthorized' }, { status: 401 })))
    session.setTokens(issueTokens('viewer'))

    await expect(unwrap(api.GET('/api/v1/merchants'))).rejects.toBeInstanceOf(ApiError)

    expect(rec.count(REFRESH)).toBe(1)
    expect(rec.count(MERCHANTS)).toBe(2)
    expect(listener).toHaveBeenCalledTimes(1)
    off()
  })
})

describe('token storage', () => {
  it('keeps the refresh token in localStorage, shared by the tabs, and the access token only in memory', () => {
    const pair = issueTokens('viewer')
    session.setTokens(pair)

    expect(localStorage.getItem('recon.refreshToken')).toBe(pair.refreshToken)
    const stored = [
      ...Object.keys(sessionStorage).map((k) => sessionStorage.getItem(k)),
      ...Object.keys(localStorage).map((k) => localStorage.getItem(k)),
    ]
    expect(stored).not.toContain(pair.accessToken)
    expect(session.getAccessToken()).toBe(pair.accessToken)
  })
})

describe('login and logout', () => {
  it('login stores the pair returned by the API', async () => {
    await login({ userName: 'analyst', password: PASSWORD })

    expect(session.getAccessToken()).toMatch(/^access-analyst-/)
    expect(session.hasSession()).toBe(true)
  })

  it('a rejected login is an ApiError 401 and never goes through the refresh logic', async () => {
    const rec = recordRequests()
    const { listener, off } = onExpire()
    session.setTokens(issueTokens('viewer'))

    await expect(login({ userName: 'viewer', password: 'wrong' })).rejects.toMatchObject({
      status: 401,
      code: 'invalid_credentials',
    })

    expect(rec.count(REFRESH)).toBe(0)
    expect(listener).not.toHaveBeenCalled()
    off()
  })

  it('logout revokes the refresh token on the API and forgets both tokens', async () => {
    const rec = recordRequests()
    const pair = issueTokens('viewer')
    session.setTokens(pair)

    await logout()

    expect(rec.count('POST /api/v1/auth/logout')).toBe(1)
    expect(db.refreshTokens.has(pair.refreshToken)).toBe(false)
    expect(session.getAccessToken()).toBeNull()
    expect(session.hasSession()).toBe(false)
  })

  it('logout forgets the tokens even when the API cannot be reached', async () => {
    server.use(http.post('*/api/v1/auth/logout', () => HttpResponse.error()))
    session.setTokens(issueTokens('viewer'))

    await expect(logout()).resolves.toBeUndefined()

    expect(session.hasSession()).toBe(false)
    expect(localStorage.length).toBe(0)
  })
})
