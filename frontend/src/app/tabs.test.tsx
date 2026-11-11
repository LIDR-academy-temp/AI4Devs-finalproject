import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { strings as accountsStrings } from '@/features/accounts/strings'
import { strings as loginStrings } from '@/features/auth/strings'
import { login, logout } from '@/lib/session/auth-api'
import { createSession, session } from '@/lib/session/session'
import { PASSWORD } from '@/test/msw/fixtures'
import { renderApp } from '@/test/render'

/** Another tab of the same browser: its own session object, sharing localStorage, locks and channel. */
function otherTab() {
  const tab = createSession()
  onTestFinished(() => tab.close())
  return tab
}

describe('the app follows the other tabs', () => {
  it('goes to Login, without the previous data, when the user signs out in another tab', async () => {
    const { router } = renderApp('/accounts?merchantId=1&providerId=101', { as: 'analyst' })
    expect(await screen.findByRole('heading', { name: accountsStrings.title })).toBeInTheDocument()

    await logout(otherTab())

    expect(await screen.findByRole('button', { name: loginStrings.submit })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.queryByText('ProviderA-USD')).not.toBeInTheDocument()
    expect(session.getAccessToken()).toBeNull()
  })

  it('enters its pending route when the user signs in in another tab', async () => {
    const { router } = renderApp('/accounts?merchantId=1&providerId=101')
    expect(await screen.findByRole('button', { name: loginStrings.submit })).toBeInTheDocument()

    await login({ userName: 'analyst', password: PASSWORD }, otherTab())

    await waitFor(() => expect(router.state.location.pathname).toBe('/accounts'))
    expect(await screen.findByText('ProviderA-USD')).toBeInTheDocument()
  })

  it('enters with the shared session when opened as a new tab', async () => {
    await login({ userName: 'analyst', password: PASSWORD }, otherTab())

    const { router } = renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})
