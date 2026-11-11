import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { strings as layoutStrings } from '@/app/layout/strings'
import { strings as accountStrings } from '@/features/accounts/strings'
import { ACCOUNT_IDS, ACCOUNTS } from '@/test/msw/fixtures'
import { db } from '@/test/msw/handlers'
import { settlementRequests } from '@/test/msw/settlements'
import { renderApp } from '@/test/render'
import { strings } from './strings'

// Spec settlement "Pantalla Settlement List: llegar a la lista" (settlements-browse design D6, D7, D8).
const picker = accountStrings.picker
const USD = ACCOUNT_IDS['ProviderA-USD']
const CLOSED = '0b6f4c1e-1a2b-4c3d-8e4f-000000000009'

function optionLabels(select: HTMLElement) {
  return within(select)
    .getAllByRole('option')
    .filter((o) => (o as HTMLOptionElement).value !== '')
    .map((o) => o.textContent)
}

describe('Settlement List: reaching the list', () => {
  it('opens from the menu with its crumbs, the three choices and no settlement requested', async () => {
    const { user, router } = renderApp('/', { as: 'analyst' })
    const nav = within(await screen.findByRole('navigation', { name: layoutStrings.mainNav }))

    await user.click(nav.getByRole('link', { name: 'Settlement List' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/settlements'))
    expect(await screen.findByRole('heading', { name: strings.list.title })).toBeInTheDocument()
    const crumbs = within(screen.getByRole('navigation', { name: layoutStrings.breadcrumb }))
    expect(crumbs.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(crumbs.getByText('Settlements')).toBeInTheDocument()
    expect(crumbs.getByText('Settlement List')).toHaveAttribute('aria-current', 'page')
    for (const label of [picker.merchant, picker.provider, picker.account])
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    expect(screen.getByText(strings.list.chooseAccount)).toBeInTheDocument()
    expect(settlementRequests('accountSettlements')).toEqual([])
  })

  it('preselects the only merchant and its only provider, and writes them to the address', async () => {
    db.providers.splice(
      db.providers.findIndex((p) => p.providerId === 102),
      1,
    )
    const { router } = renderApp('/settlements', { as: 'viewer' })

    await waitFor(() => expect(router.state.location.search).toMatchObject({ merchantId: 1, providerId: 101 }))
    expect(screen.getByLabelText(picker.merchant)).toHaveValue('1')
    await waitFor(() => expect(screen.getByLabelText(picker.provider)).toHaveValue('101'))
  })

  it('completes merchant and provider from a link with the account alone', async () => {
    const { router } = renderApp(`/settlements?accountId=${USD}`, { as: 'analyst' })

    await waitFor(() => expect(screen.getByLabelText(picker.account)).toHaveValue(USD))
    expect(screen.getByLabelText(picker.merchant)).toHaveValue('1')
    expect(screen.getByLabelText(picker.provider)).toHaveValue('101')
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ merchantId: 1, providerId: 101, accountId: USD }),
    )
    expect(screen.queryByText(strings.list.chooseAccount)).not.toBeInTheDocument()
  })

  it('says an account outside the scope is not available, without a list and without saying whether it exists', async () => {
    renderApp(`/settlements?accountId=${ACCOUNT_IDS['ProviderC-Alt']}`, { as: 'viewer' })

    expect(await screen.findByText(picker.notAvailable)).toBeInTheDocument()
    expect(screen.queryByText('ProviderC-Alt')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(settlementRequests('accountSettlements')).toEqual([])
  })

  it('offers a closed account too, named as closed', async () => {
    db.accounts.push({ ...ACCOUNTS[0]!, accountId: CLOSED, name: 'ProviderA-Old', isActive: false })
    const { user, router } = renderApp('/settlements?merchantId=1&providerId=101', { as: 'analyst' })

    const account = await screen.findByLabelText(picker.account)
    await waitFor(() =>
      expect(optionLabels(account)).toEqual(['ProviderA-EUR', 'ProviderA-Old (closed)', 'ProviderA-USD']),
    )
    await user.selectOptions(account, 'ProviderA-Old (closed)')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ accountId: CLOSED }))
  })
})
