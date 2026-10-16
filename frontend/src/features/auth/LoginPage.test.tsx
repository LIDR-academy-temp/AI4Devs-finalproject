import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { strings as layoutStrings } from '@/app/layout/strings'
import { INACTIVE_USER, PASSWORD } from '@/test/msw/fixtures'
import { db, issueTokens } from '@/test/msw/handlers'
import { recordRequests } from '@/test/msw/record'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { strings } from './strings'

async function signIn(user: ReturnType<typeof renderApp>['user'], userName: string, password: string) {
  await user.type(await screen.findByLabelText(strings.userName), userName)
  await user.type(screen.getByLabelText(strings.password), password)
  await user.click(screen.getByRole('button', { name: strings.submit }))
}

describe('Login', () => {
  it('sends a visitor without session to Login, keeping the requested route, without calling protected routes', async () => {
    const rec = recordRequests()
    const { router } = renderApp('/accounts?merchantId=1&providerId=101')

    expect(await screen.findByRole('button', { name: strings.submit })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toMatchObject({ redirect: '/accounts?merchantId=1&providerId=101' })
    expect(rec.protectedCalls()).toEqual([])
  })

  it('signs in with seed credentials and lands on Dashboard', async () => {
    const { user, router } = renderApp('/login')

    await signIn(user, 'analyst', PASSWORD)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('returns to the requested route after signing in', async () => {
    const { user, router } = renderApp('/does-not-exist?x=1')

    await signIn(user, 'viewer', PASSWORD)

    await waitFor(() => expect(router.state.location.href).toBe('/does-not-exist?x=1'))
  })

  it('ignores a redirect that leaves the application', async () => {
    const { user, router } = renderApp('/login?redirect=%2F%2Fevil.example%2Fphish')

    await signIn(user, 'viewer', PASSWORD)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.href).toBe('/')
  })

  it('validates required fields in the browser without calling the API', async () => {
    const rec = recordRequests()
    const { user } = renderApp('/login')
    await user.type(await screen.findByLabelText(strings.password), 'whatever')

    await user.click(screen.getByRole('button', { name: strings.submit }))

    expect(await screen.findByText(strings.userNameRequired)).toBeInTheDocument()
    expect(screen.getByLabelText(strings.userName)).toHaveFocus()
    expect(rec.calls).toEqual([])
  })

  it('disables the button while the request is in flight', async () => {
    let release: () => void = () => {}
    server.use(
      http.post('*/api/v1/auth/login', async () => {
        await new Promise<void>((resolve) => {
          release = resolve
        })
        return HttpResponse.json(issueTokens('viewer'))
      }),
    )
    const { user } = renderApp('/login')

    await signIn(user, 'viewer', PASSWORD)

    await waitFor(() => expect(screen.getByRole('button', { name: strings.submit })).toBeDisabled())
    release()
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('shows the generic message on a wrong password, empties Password and keeps User name', async () => {
    const { user } = renderApp('/login')

    await signIn(user, 'viewer', 'wrong-password')

    expect(await screen.findByText(strings.invalidCredentials)).toBeInTheDocument()
    expect(screen.getByLabelText(strings.password)).toHaveValue('')
    expect(screen.getByLabelText(strings.userName)).toHaveValue('viewer')
  })

  it('shows the same message for an inactive user', async () => {
    const { user } = renderApp('/login')

    await signIn(user, INACTIVE_USER, PASSWORD)

    expect(await screen.findByText(strings.invalidCredentials)).toBeInTheDocument()
  })

  it.each([
    ['a 500', () => HttpResponse.json({ code: 'internal_error', message: 'boom' }, { status: 500 })],
    ['a network error', () => HttpResponse.error()],
  ])('tells the server is unreachable on %s, not that the credentials are wrong', async (_, reply) => {
    server.use(http.post('*/api/v1/auth/login', reply))
    const { user } = renderApp('/login')

    await signIn(user, 'viewer', PASSWORD)

    expect(await screen.findByText(strings.serverUnreachable)).toBeInTheDocument()
    expect(screen.queryByText(strings.invalidCredentials)).not.toBeInTheDocument()
  })

  it('sends a signed-in user who opens /login to Dashboard', async () => {
    const { router } = renderApp('/login', { as: 'analyst' })

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('Login form', () => {
  const fields = () => ({
    userName: screen.getByLabelText(strings.userName),
    password: screen.getByLabelText(strings.password),
  })

  it('is empty after signing out, even though the user typed the credentials', async () => {
    const { user } = renderApp('/login')
    await signIn(user, 'analyst', PASSWORD)
    await screen.findByRole('heading', { name: 'Dashboard' })

    await user.click(screen.getByRole('button', { name: layoutStrings.signOut }))

    await screen.findByRole('button', { name: strings.submit })
    expect(fields().userName).toHaveValue('')
    expect(fields().password).toHaveValue('')
  })

  it('is empty after the session expires', async () => {
    const { user, router } = renderApp('/login')
    await signIn(user, 'viewer', PASSWORD)
    await screen.findByRole('heading', { name: 'Dashboard' })
    db.accessTokens.clear()
    db.refreshTokens.clear()

    await router.navigate({ to: '/accounts' })

    expect(await screen.findByText(strings.sessionExpired)).toBeInTheDocument()
    expect(fields().userName).toHaveValue('')
    expect(fields().password).toHaveValue('')
  })

  it('keeps the password when the user name is corrected', async () => {
    const { user } = renderApp('/login')
    await user.type(await screen.findByLabelText(strings.userName), 'viewr')
    await user.type(fields().password, 'secret-typed')

    await user.clear(fields().userName)
    await user.type(fields().userName, 'viewer')

    expect(fields().password).toHaveValue('secret-typed')
  })

  it('declares the autocomplete hints password managers rely on', async () => {
    renderApp('/login')

    expect(await screen.findByLabelText(strings.userName)).toHaveAttribute('autocomplete', 'username')
    expect(fields().password).toHaveAttribute('autocomplete', 'current-password')
  })
})
