import { useQuery } from '@tanstack/react-query'
import { createRoute } from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { strings as loginStrings } from '@/features/auth/strings'
import { api, unwrap } from '@/lib/api/client'
import { session } from '@/lib/session/session'
import { PASSWORD } from '@/test/msw/fixtures'
import { db, issueTokens } from '@/test/msw/handlers'
import { recordRequests } from '@/test/msw/record'
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
    sessionStorage.setItem('recon.refreshToken', issueTokens('analyst').refreshToken)

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
