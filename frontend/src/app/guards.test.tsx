import { useQuery } from '@tanstack/react-query'
import { createRoute } from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { strings as loginStrings } from '@/features/auth/strings'
import { api, unwrap } from '@/lib/api/client'
import { session } from '@/lib/session/session'
import { PASSWORD } from '@/test/msw/fixtures'
import { db, issueTokens } from '@/test/msw/handlers'
import { recordRequests } from '@/test/msw/record'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { strings } from './layout/strings'
import { appRoute } from './router'

/** A screen that loads merchants, standing in for any data screen. */
function Probe() {
  const merchants = useQuery({ queryKey: ['probe'], queryFn: () => unwrap(api.GET('/api/v1/merchants')) })
  return <p>{merchants.data ? `Probe loaded ${merchants.data.length}` : 'Probe loading'}</p>
}

const probeRoute = createRoute({ getParentRoute: () => appRoute, path: '/probe', component: Probe })
const restrictedRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/restricted',
  staticData: { requires: 'settlement.process' },
  component: Probe,
})
const extraRoutes = [probeRoute, restrictedRoute]

describe('session guard', () => {
  it('recovers the session from the refresh token after a reload without showing Login', async () => {
    const rec = recordRequests()
    localStorage.setItem('recon.refreshToken', issueTokens('analyst').refreshToken)

    const { router } = renderApp('/probe', { extraRoutes })

    expect(await screen.findByText('Probe loaded 2')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/probe')
    expect(rec.calls[0]).toBe('POST /api/v1/auth/refresh')
    expect(rec.count('POST /api/v1/auth/refresh')).toBe(1)
  })

  it('sends the user to Login with a notice when the session expires, and back to where they were', async () => {
    const pair = issueTokens('viewer')
    session.setTokens(pair)
    const { user, router } = renderApp('/', { extraRoutes })
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    db.accessTokens.delete(pair.accessToken)
    db.refreshTokens.clear()

    await router.navigate({ to: '/probe' })

    expect(await screen.findByText(loginStrings.sessionExpired)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(session.hasSession()).toBe(false)

    await user.type(screen.getByLabelText(loginStrings.userName), 'viewer')
    await user.type(screen.getByLabelText(loginStrings.password), PASSWORD)
    await user.click(screen.getByRole('button', { name: loginStrings.submit }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/probe'))
    expect(await screen.findByText('Probe loaded 1')).toBeInTheDocument()
  })

  it('a manual sign-out with a request in flight ends on Login without the "expired" notice', async () => {
    let answer: () => void = () => {}
    const answered = new Promise<void>((resolve) => {
      answer = resolve
    })
    server.use(
      http.get('*/api/v1/merchants', async () => {
        await answered
        return HttpResponse.json({ code: 'unauthorized', message: 'Unauthorized' }, { status: 401 })
      }),
    )
    const expired = vi.fn()
    onTestFinished(session.onExpire(expired))
    const { user, router } = renderApp('/probe', { as: 'analyst', extraRoutes })
    expect(await screen.findByText('Probe loading')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: strings.signOut }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    answer()

    await waitFor(() => expect(screen.getByRole('button', { name: loginStrings.submit })).toBeInTheDocument())
    // Let the answered request finish going through authFetch before checking nothing expired.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(expired).not.toHaveBeenCalled()
    expect(screen.queryByText(loginStrings.sessionExpired)).not.toBeInTheDocument()
    expect(router.state.location.search).not.toMatchObject({ reason: 'expired' })
  })
})

describe('permission guard', () => {
  it('shows "no access" to a role without the permission, without calling the screen endpoints', async () => {
    const rec = recordRequests()

    renderApp('/restricted', { as: 'viewer', extraRoutes })

    expect(await screen.findByText(strings.forbiddenTitle)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: strings.backToDashboard })).toHaveAttribute('href', '/')
    expect(rec.count('GET /api/v1/merchants')).toBe(0)
  })

  it('shows the screen to a role with the permission', async () => {
    renderApp('/restricted', { as: 'analyst', extraRoutes })

    expect(await screen.findByText('Probe loaded 2')).toBeInTheDocument()
    expect(screen.queryByText(strings.forbiddenTitle)).not.toBeInTheDocument()
  })
})
