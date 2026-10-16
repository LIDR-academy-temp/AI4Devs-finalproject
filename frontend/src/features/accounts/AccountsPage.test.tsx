import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import { db } from '@/test/msw/handlers'
import { recordRequests } from '@/test/msw/record'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { strings } from './strings'

function optionLabels(select: HTMLElement) {
  return within(select)
    .getAllByRole('option')
    .filter((o) => (o as HTMLOptionElement).value !== '')
    .map((o) => o.textContent)
}

/** Account names in table order. */
async function accountNames() {
  const table = await screen.findByRole('table')
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent)
}

async function accountRow(name: string) {
  return within(await screen.findByRole('row', { name: new RegExp(`^${name}\\b`) }))
}

/** The text shown next to a channel inside an account row. */
function channelEntry(row: Awaited<ReturnType<typeof accountRow>>, channel: string) {
  return row.getByText(channel).closest('li')?.textContent
}

const unassignedWarning = () => screen.queryByRole('alert', { name: strings.unassignedTitle })

describe('Accounts: merchant → provider', () => {
  it('preselects the only visible merchant and offers its providers; the selection goes to the address', async () => {
    const { router } = renderApp('/accounts', { as: 'viewer' })

    await screen.findByRole('option', { name: 'Merchant A' })
    const merchant = screen.getByLabelText(strings.merchant)
    expect(optionLabels(merchant)).toEqual(['Merchant A'])
    await waitFor(() => expect(merchant).toHaveValue('1'))
    const provider = await screen.findByLabelText(strings.provider)
    await waitFor(() => expect(optionLabels(provider)).toEqual(['Provider A', 'Provider B']))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ merchantId: 1 }))
  })

  it('preselects the only provider of the chosen merchant and shows its accounts', async () => {
    const { user, router } = renderApp('/accounts', { as: 'analyst' })

    await screen.findByRole('option', { name: 'Merchant B' })
    await user.selectOptions(screen.getByLabelText(strings.merchant), 'Merchant B')

    await waitFor(() => expect(screen.getByLabelText(strings.provider)).toHaveValue('201'))
    expect(await accountNames()).toEqual(['ProviderC-Alt', 'ProviderC-USD'])
    expect(router.state.location.search).toMatchObject({ merchantId: 2, providerId: 201 })
  })

  it('restores the selection from a direct link', async () => {
    renderApp('/accounts?merchantId=1&providerId=102', { as: 'admin' })

    expect(await accountNames()).toEqual(['ProviderB-Main'])
    expect(screen.getByLabelText(strings.merchant)).toHaveValue('1')
    expect(screen.getByLabelText(strings.provider)).toHaveValue('102')
  })

  it('says a merchant outside the scope is not available, shows none of its data and lets the user choose', async () => {
    const rec = recordRequests()
    renderApp('/accounts?merchantId=2&providerId=201', { as: 'viewer' })

    expect(await screen.findByText(strings.notAvailable)).toBeInTheDocument()
    expect(screen.queryByText(/ProviderC/)).not.toBeInTheDocument()
    expect(optionLabels(screen.getByLabelText(strings.merchant))).toEqual(['Merchant A'])
    expect(rec.count('GET /api/v1/merchants/2/providers')).toBe(0)
    expect(rec.count('GET /api/v1/providers/201')).toBe(0)
  })
})

describe('Accounts: accounts of the provider', () => {
  it('lists the accounts of Provider A by name with policy, cap and status', async () => {
    renderApp('/accounts?merchantId=1&providerId=101', { as: 'viewer' })

    expect(await accountNames()).toEqual(['ProviderA-EUR', 'ProviderA-USD'])
    const eur = await accountRow('ProviderA-EUR')
    expect(eur.getByText('hold_until_term')).toBeInTheDocument()
    expect(eur.getByText('50,000.0000')).toBeInTheDocument()
    expect(eur.getByText(strings.active)).toBeInTheDocument()
    const usd = await accountRow('ProviderA-USD')
    expect(usd.getByText(strings.none)).toBeInTheDocument()
    expect(usd.getByText(strings.active)).toBeInTheDocument()
  })

  it('shows the release policy of Provider B', async () => {
    renderApp('/accounts?merchantId=1&providerId=102', { as: 'viewer' })

    expect((await accountRow('ProviderB-Main')).getByText('release_on_chargeback')).toBeInTheDocument()
  })

  it('shows an empty state for a provider without accounts', async () => {
    db.providers.push({ providerId: 103, merchantId: 1, name: 'Provider D', isActive: true })
    renderApp('/accounts?merchantId=1&providerId=103', { as: 'admin' })

    expect(await screen.findByText(strings.noAccounts)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('Accounts: channels and primary account', () => {
  it('marks the primary channels of each account', async () => {
    renderApp('/accounts?merchantId=1&providerId=101', { as: 'viewer' })

    const usd = await accountRow('ProviderA-USD')
    await waitFor(() => expect(channelEntry(usd, 'RAM-01')).toContain(strings.primary))
    expect(channelEntry(usd, 'RAM-02')).toContain(strings.primary)
    const eur = await accountRow('ProviderA-EUR')
    await waitFor(() => expect(channelEntry(eur, 'RAM-03')).toContain(strings.primary))
  })

  it('shows a historical channel with its current primary account', async () => {
    db.accountChannels.push({ accountId: ACCOUNT_IDS['ProviderA-EUR'], channelId: 1001, isPrimary: false })
    renderApp('/accounts?merchantId=1&providerId=101', { as: 'admin' })

    const eur = await accountRow('ProviderA-EUR')
    await waitFor(() => expect(channelEntry(eur, 'RAM-01')).toContain(strings.primaryIn('ProviderA-USD')))
    expect(channelEntry(eur, 'RAM-01')).toContain(strings.historical)
    expect(channelEntry(eur, 'RAM-03')).toContain(strings.primary)
  })
})

describe('Accounts: channels not assigned yet', () => {
  it('warns about RAM-07 in Provider A, and not about RAM-13', async () => {
    renderApp('/accounts?merchantId=1&providerId=101', { as: 'viewer' })

    await waitFor(() => expect(unassignedWarning()).toBeInTheDocument())
    expect(unassignedWarning()).toHaveTextContent('RAM-07')
    expect(unassignedWarning()).not.toHaveTextContent('RAM-13')
  })

  it('warns about RAM-13 in Provider B, and not about RAM-07', async () => {
    renderApp('/accounts?merchantId=1&providerId=102', { as: 'viewer' })

    await waitFor(() => expect(unassignedWarning()).toBeInTheDocument())
    expect(unassignedWarning()).toHaveTextContent('RAM-13')
    expect(unassignedWarning()).not.toHaveTextContent('RAM-07')
  })

  it('shows no warning for a provider without pending channels', async () => {
    renderApp('/accounts?merchantId=2&providerId=201', { as: 'admin' })

    expect(await accountNames()).toEqual(['ProviderC-Alt', 'ProviderC-USD'])
    expect(unassignedWarning()).not.toBeInTheDocument()
  })
})

describe('Accounts: loading and errors', () => {
  it('shows an error with Retry, which loads the accounts', async () => {
    server.use(
      http.get('*/api/v1/providers/101', () => HttpResponse.json({ code: 'internal_error' }, { status: 500 }), {
        once: true,
      }),
    )
    const { user } = renderApp('/accounts?merchantId=1&providerId=101', { as: 'viewer' })

    expect(await screen.findByText(strings.loadError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.retry }))

    expect(await accountNames()).toEqual(['ProviderA-EUR', 'ProviderA-USD'])
  })

  it('never shows the previous provider as if it were the new one while loading', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { user } = renderApp('/accounts?merchantId=1&providerId=101', { as: 'viewer' })
    expect(await accountNames()).toEqual(['ProviderA-EUR', 'ProviderA-USD'])
    await waitFor(() => expect(unassignedWarning()).toBeInTheDocument())
    server.use(
      http.get('*/api/v1/providers/102', async () => {
        await gate
        return undefined
      }),
    )

    await user.selectOptions(screen.getByLabelText(strings.provider), 'Provider B')

    expect(await screen.findByText(strings.loading)).toBeInTheDocument()
    expect(screen.queryByText('ProviderA-USD')).not.toBeInTheDocument()
    expect(unassignedWarning()).not.toBeInTheDocument()
    release()
    expect(await accountNames()).toEqual(['ProviderB-Main'])
  })
})
