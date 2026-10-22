import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { strings as loginStrings } from '@/features/auth/strings'
import { session } from '@/lib/session/session'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import { seedImport } from '@/test/msw/imports'
import { recordRequests } from '@/test/msw/record'
import { renderApp } from '@/test/render'
import { strings } from './strings'

const MVP_ENTRIES = [
  'Dashboard',
  'New Reconciliation',
  'In Progress',
  'Settlement List',
  'Payments',
  'Transaction Search',
  'Missing & Duplicates',
  'Unsettled Transactions per Channel',
  'Merchants & Providers',
  'Accounts',
  'Fees',
  'Channel Assignment',
  'Matching Rules',
  'Users & Roles',
  'Audit Log',
]

async function mainNav() {
  return within(await screen.findByRole('navigation', { name: strings.mainNav }))
}

function linkNames(nav: { queryAllByRole: (role: string) => HTMLElement[] }) {
  return nav.queryAllByRole('link').map((link) => link.textContent)
}

describe('navigation filtered by permissions', () => {
  it('viewer does not see the Reconciliation group, Payments, Users & Roles or Audit Log', async () => {
    renderApp('/', { as: 'viewer' })
    const nav = await mainNav()

    for (const hidden of [
      'Reconciliation',
      'New Reconciliation',
      'In Progress',
      'Payments',
      'Users & Roles',
      'Audit Log',
    ]) {
      expect(nav.queryByText(hidden)).not.toBeInTheDocument()
    }
    expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/')
    expect(nav.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts')
    expect(nav.getByRole('link', { name: 'Settlement List' })).toHaveAttribute('href', '/settlements')
  })

  it('analyst sees New Reconciliation as a link and In Progress disabled, and not Payments nor Users & Roles', async () => {
    renderApp('/', { as: 'analyst' })
    const nav = await mainNav()

    expect(nav.getByRole('link', { name: 'New Reconciliation' })).toHaveAttribute('href', '/reconciliations/new')
    expect(nav.getByRole('link', { name: 'Settlement List' })).toHaveAttribute('href', '/settlements')
    const inProgress = nav.getByText('In Progress').closest('[aria-disabled]')
    expect(inProgress).toHaveAttribute('aria-disabled', 'true')
    expect(nav.queryByRole('link', { name: 'In Progress' })).not.toBeInTheDocument()
    expect(nav.queryByText('Payments')).not.toBeInTheDocument()
    expect(nav.queryByText('Users & Roles')).not.toBeInTheDocument()
  })

  it('admin sees every MVP entry; only Dashboard, New Reconciliation, Settlement List and Accounts are links', async () => {
    renderApp('/', { as: 'admin' })
    const nav = await mainNav()

    for (const entry of MVP_ENTRIES) expect(nav.getByText(entry)).toBeInTheDocument()
    expect(linkNames(nav)).toEqual(['Dashboard', 'New Reconciliation', 'Settlement List', 'Accounts'])
  })

  it('marks Settlement List as the active entry with filters in the address', async () => {
    renderApp(`/settlements?accountId=${ACCOUNT_IDS['ProviderA-USD']}&status=paid`, { as: 'viewer' })
    const nav = await mainNav()

    await waitFor(() =>
      expect(nav.getByRole('link', { name: 'Settlement List' })).toHaveAttribute('aria-current', 'page'),
    )
    expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('marks New Reconciliation as the active entry inside an import', async () => {
    const { importId } = seedImport('batch-clean')
    renderApp(`/imports/${importId}`, { as: 'analyst' })
    const nav = await mainNav()

    expect(nav.getByRole('link', { name: 'New Reconciliation' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('clicking an entry that is not built yet does not change the route', async () => {
    const { user, router } = renderApp('/', { as: 'admin' })
    const nav = await mainNav()

    await user.click(nav.getByText('Payments'))

    expect(router.state.location.pathname).toBe('/')
  })
})

describe('identity', () => {
  it('shows name, role and Sign out, without the merchants of the scope', async () => {
    renderApp('/', { as: 'analyst' })
    const banner = within(await screen.findByRole('banner'))

    expect(banner.getByText('Analyst')).toBeInTheDocument()
    expect(banner.getByText('analyst')).toBeInTheDocument()
    expect(banner.getByRole('button', { name: strings.signOut })).toBeInTheDocument()
    expect(banner.queryByText('Merchant A, Merchant B')).not.toBeInTheDocument()
  })

  it('does not show All merchants for a user whose scope is all', async () => {
    renderApp('/', { as: 'admin' })
    const banner = within(await screen.findByRole('banner'))

    expect(banner.getByText('Admin')).toBeInTheDocument()
    expect(banner.getByText('admin')).toBeInTheDocument()
    expect(banner.getByRole('button', { name: strings.signOut })).toBeInTheDocument()
    expect(banner.queryByText('All merchants')).not.toBeInTheDocument()
  })
})

describe('breadcrumbs and pages', () => {
  it('shows where Accounts sits in the map, with Dashboard as a link', async () => {
    const { user, router } = renderApp('/accounts', { as: 'viewer' })
    const crumbs = within(await screen.findByRole('navigation', { name: strings.breadcrumb }))

    expect(crumbs.getByText('Administration')).toBeInTheDocument()
    expect(crumbs.getByText('Accounts')).toHaveAttribute('aria-current', 'page')

    await user.click(crumbs.getByRole('link', { name: 'Dashboard' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('shows Page not found inside the layout for an unknown route', async () => {
    renderApp('/does-not-exist', { as: 'viewer' })

    expect(await screen.findByRole('heading', { name: strings.notFoundTitle })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: strings.backToDashboard })).toHaveAttribute('href', '/')
    expect(screen.getByRole('navigation', { name: strings.mainNav })).toBeInTheDocument()
  })
})

describe('sign out', () => {
  it('revokes the refresh token, shows Login, and Back does not bring the previous screen back', async () => {
    const rec = recordRequests()
    const { user, router } = renderApp('/accounts', { as: 'analyst' })

    await user.click(await screen.findByRole('button', { name: strings.signOut }))

    expect(await screen.findByRole('button', { name: loginStrings.submit })).toBeInTheDocument()
    expect(rec.count('POST /api/v1/auth/logout')).toBe(1)
    expect(session.hasSession()).toBe(false)

    router.history.back()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })
})
