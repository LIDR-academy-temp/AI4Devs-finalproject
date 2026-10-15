import { waitFor } from '@testing-library/react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createApi, unwrap } from '@/lib/api/client'
import { PASSWORD } from '@/test/msw/fixtures'
import { db, issueTokens } from '@/test/msw/handlers'
import { login, logout } from './auth-api'
import { createSession } from './session'

/** A simulated browser tab: its own memory, sharing localStorage, the lock manager and the channel with the rest. */
function openTab() {
  const tab = createSession()
  onTestFinished(() => tab.close())
  return { session: tab, api: createApi(tab) }
}

describe('two tabs renewing at the same time', () => {
  it('renew one after the other, each with the refresh token current in its turn, and both stay signed in', async () => {
    const pair = issueTokens('viewer')
    db.accessTokens.delete(pair.accessToken)
    const a = openTab()
    const b = openTab()
    a.session.setTokens(pair)
    b.session.setTokens(pair)
    const expiredA = vi.fn()
    const expiredB = vi.fn()
    onTestFinished(a.session.onExpire(expiredA))
    onTestFinished(b.session.onExpire(expiredB))

    const [fromA, fromB] = await Promise.all([
      unwrap(a.api.GET('/api/v1/merchants')),
      unwrap(b.api.GET('/api/v1/merchants')),
    ])

    expect(fromA).toHaveLength(1)
    expect(fromB).toHaveLength(1)
    expect(db.refreshLog).toHaveLength(2)
    expect(db.refreshLog.every((call) => call.valid)).toBe(true)
    expect(db.refreshLog[0]?.refreshToken).not.toBe(db.refreshLog[1]?.refreshToken)
    expect(expiredA).not.toHaveBeenCalled()
    expect(expiredB).not.toHaveBeenCalled()
  })
})

describe('login and logout across tabs', () => {
  it('a tab opened later finds the shared session and renews its own access token', async () => {
    const a = openTab()
    await login({ userName: 'analyst', password: PASSWORD }, a.session)
    const b = openTab()

    expect(b.session.hasSession()).toBe(true)
    expect(b.session.getAccessToken()).toBeNull()
    await expect(unwrap(b.api.GET('/api/v1/merchants'))).resolves.toHaveLength(2)
  })

  it('signing out in one tab forgets the session in the other and tells it', async () => {
    const a = openTab()
    const b = openTab()
    await login({ userName: 'analyst', password: PASSWORD }, a.session)
    await unwrap(b.api.GET('/api/v1/merchants'))
    const signedOutInB = vi.fn()
    onTestFinished(b.session.onLogout(signedOutInB))

    await logout(a.session)

    await waitFor(() => expect(signedOutInB).toHaveBeenCalledTimes(1))
    expect(b.session.getAccessToken()).toBeNull()
    expect(b.session.hasSession()).toBe(false)
    expect(localStorage.length).toBe(0)
  })

  it('signing in in one tab tells the others', async () => {
    const a = openTab()
    const b = openTab()
    const signedInElsewhere = vi.fn()
    onTestFinished(b.session.onLogin(signedInElsewhere))

    await login({ userName: 'analyst', password: PASSWORD }, a.session)

    await waitFor(() => expect(signedInElsewhere).toHaveBeenCalledTimes(1))
    expect(b.session.hasSession()).toBe(true)
  })
})
