import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { feeFixture, feeRequests, respondNextFee, seedAccountFees } from '@/test/msw/fees'
import { ACCOUNT_IDS, type UserName } from '@/test/msw/fixtures'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'
import { strings } from './strings'

// Spec fees "Pantalla Fees: acceso", "columnas y orden", "filtros en la dirección" and "paginación, carga y errores"
// (web-admin-fees design D3, D9). The fake filters and pages; the screen is checked on what it asks and shows.
const s = strings.global
const USD = ACCOUNT_IDS['ProviderA-USD']
const USD_FILTERS = `merchantId=1&providerId=101&accountId=${USD}`

async function openFees(search = '', as: UserName = 'analyst') {
  const rendered = renderApp(`/fees${search ? `?${search}` : ''}`, { as })
  await screen.findByRole('table', { name: s.tableLabel }, OPENING)
  return rendered
}

const table = () => screen.getByRole('table', { name: s.tableLabel })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent)
/** The two lines of the first cell of a row: its account, then its merchant and provider. */
const linesOf = (row: HTMLElement) =>
  [...(within(row).getAllByRole('cell')[0]?.children ?? [])].map((line) => line.textContent)
const headers = () =>
  within(table())
    .getAllByRole('columnheader')
    .map((h) => h.textContent)

/** The query of the last request of the list, as the screen sent it. */
function lastQuery(): Record<string, string> {
  const url = feeRequests('list').at(-1)!.url
  return Object.fromEntries(new URL(url, window.location.origin).searchParams)
}

const manyFees = (count: number) =>
  Array.from({ length: count }, (_, i) => feeFixture({ feeTypeId: 101 + (i % 21), fixedAmount: `${i + 1}.0000` }))

describe('Fees: access and read only', () => {
  it('viewer sees the table and no action to create, edit or close', async () => {
    await openFees('', 'viewer')

    expect(screen.getByRole('heading', { level: 1, name: s.title })).toBeInTheDocument()
    for (const name of [/^Add fee/, /^Edit/, /^Change from date/, /^Close/]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('admin cannot edit here either: each account links to its fees page', async () => {
    const { user, router } = await openFees('', 'admin')

    expect(screen.queryByRole('button', { name: 'Add fee' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument()
    await user.click(within(bodyRows()[0]!).getByRole('link', { name: 'ProviderA-EUR' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/accounts/${ACCOUNT_IDS['ProviderA-EUR']}/fees`))
  })
})

describe('Fees: columns and order', () => {
  it('a fee open on both sides reads always → open with its rate and status', async () => {
    seedAccountFees('ProviderA-USD', [feeFixture({ feeTypeId: 1, percentage: '0.029000' })])
    await openFees(USD_FILTERS)

    expect(headers()).toEqual([
      'Account',
      'Type',
      'Applies to',
      'Value',
      'Valid from',
      'Valid to',
      'Status',
      'Last change',
    ])
    expect(linesOf(bodyRows()[0]!)).toEqual(['ProviderA-USD', 'Merchant A · Provider A'])
    expect(cellsOf(bodyRows()[0]!).slice(1)).toEqual([
      'MDR',
      'E · Successful',
      '2.900 %',
      'always',
      'open',
      'Active',
      '2026-10-01',
    ])
  })

  it('a scheduled fee shows Scheduled with its status colour', async () => {
    seedAccountFees('ProviderA-USD', [feeFixture({ feeTypeId: 5, fixedAmount: '5.0000', startDate: '2027-01-01' })])
    await openFees(`${USD_FILTERS}&status=scheduled`)

    const badge = within(bodyRows()[0]!).getByText('Scheduled')
    expect(badge).toHaveAttribute('data-variant', 'warning')
  })

  it('merchant and provider go under the account in each row: no group header rows', async () => {
    await openFees('status=all', 'admin')

    const firsts = bodyRows().map((row) => within(row).getAllByRole('cell').length)
    expect(new Set(firsts)).toEqual(new Set([8]))
    expect(linesOf(bodyRows()[0]!)[1]).toBe('Merchant A · Provider A')
    expect(linesOf(bodyRows().at(-1)!)[1]).toBe('Merchant B · Provider C')
  })
})

describe('Fees: filters in the address', () => {
  it('asks for the active fees by default', async () => {
    await openFees()

    expect(lastQuery()).toEqual({ status: 'active', page: '1' })
    expect(screen.getByLabelText(s.filters.status)).toHaveValue('active')
  })

  it('All statuses writes status=all, asks without status and goes back to page 1', async () => {
    seedAccountFees('ProviderA-USD', manyFees(60))
    const { user, router } = await openFees(`${USD_FILTERS}&page=2`)

    await user.selectOptions(screen.getByLabelText(s.filters.status), s.filters.statuses.all)

    await waitFor(() => expect(router.state.location.search).toMatchObject({ status: 'all' }))
    expect(router.state.location.search).not.toHaveProperty('page')
    await waitFor(() => expect(lastQuery()).toEqual({ merchantId: '1', providerId: '101', accountId: USD, page: '1' }))
  })

  it('changing the merchant clears provider and account; changing the provider clears the account', async () => {
    const { user, router } = await openFees(USD_FILTERS, 'admin')

    await user.selectOptions(await screen.findByLabelText(s.filters.provider), 'Provider B')
    await waitFor(() => expect(router.state.location.search).toEqual({ merchantId: 1, providerId: 102 }))

    await user.selectOptions(screen.getByLabelText(s.filters.merchant), 'Merchant B')
    await waitFor(() => expect(router.state.location.search).toEqual({ merchantId: 2 }))
    expect(screen.getByLabelText(s.filters.account)).toBeDisabled()
  })

  it('kind is sent as written in the address', async () => {
    const { user } = await openFees()

    await user.selectOptions(screen.getByLabelText(s.filters.kind), s.filters.kinds.free_amount)

    await waitFor(() => expect(lastQuery()).toEqual({ kind: 'free_amount', status: 'active', page: '1' }))
  })

  it('the search is written after a pause, trimmed, and goes back to page 1', async () => {
    const { user, router } = await openFees('status=all&page=1')

    await user.type(screen.getByLabelText(s.filters.search), ' chargeback')

    await waitFor(() => expect(router.state.location.search).toMatchObject({ q: 'chargeback' }))
    await waitFor(() => expect(lastQuery()).toEqual({ q: 'chargeback', page: '1' }))
    expect(feeRequests('list').filter((r) => r.url.includes('q=')).length).toBe(1)
  })

  it('reloading with filters shows them and asks the same query', async () => {
    await openFees('merchantId=1&kind=preset&q=monthly&status=all', 'analyst')

    expect(screen.getByLabelText(s.filters.merchant)).toHaveValue('1')
    expect(screen.getByLabelText(s.filters.kind)).toHaveValue('preset')
    expect(screen.getByLabelText(s.filters.status)).toHaveValue('all')
    expect(screen.getByLabelText(s.filters.search)).toHaveValue('monthly')
    expect(lastQuery()).toEqual({ merchantId: '1', kind: 'preset', q: 'monthly', page: '1' })
  })

  it('invalid values in the address are ignored', async () => {
    await openFees('status=withdrawn&kind=other')

    expect(lastQuery()).toEqual({ status: 'active', page: '1' })
  })

  it('a merchant outside the scope is not available, asks nothing and lets the user choose again', async () => {
    const { user } = renderApp('/fees?merchantId=2', { as: 'viewer' })

    expect(await screen.findByText(s.notAvailable, undefined, OPENING)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: s.tableLabel })).not.toBeInTheDocument()
    expect(feeRequests('list')).toHaveLength(0)

    await user.selectOptions(screen.getByLabelText(s.filters.merchant), s.filters.allMerchants)
    expect(await screen.findByRole('table', { name: s.tableLabel })).toBeInTheDocument()
  })
})

describe('Fees: paging, loading and errors', () => {
  it('Next asks for page 2 and the summary says where it is', async () => {
    seedAccountFees('ProviderA-USD', manyFees(120))
    const { user, router } = await openFees(USD_FILTERS)

    expect(screen.getByText('Page 1 of 3 · 120 fees')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 2 }))
    expect(await screen.findByText('Page 2 of 3 · 120 fees')).toBeInTheDocument()
    expect(lastQuery()).toMatchObject({ page: '2' })
  })

  it('a page that no longer exists goes to the last one without a new history entry', async () => {
    seedAccountFees('ProviderA-USD', manyFees(60))
    const { router } = renderApp(`/fees?${USD_FILTERS}&page=9`, { as: 'analyst' })
    const entries = router.history.length

    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 2 }), OPENING)
    expect(router.history.length).toBe(entries)
  })

  it('says when nothing matches', async () => {
    await openFees('q=nothing-like-this')

    expect(screen.getByText(s.empty)).toBeInTheDocument()
  })

  it('a failure shows the error, and Retry asks the same page again', async () => {
    respondNextFee('list', { status: 500, code: 'internal_error' })
    const { user } = renderApp('/fees?status=closed', { as: 'analyst' })

    expect(await screen.findByText(s.loadError, undefined, OPENING)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.retry }))

    expect(await screen.findByRole('table', { name: s.tableLabel })).toBeInTheDocument()
    expect(feeRequests('list').map((r) => r.url)).toEqual([
      '/api/v1/fees?status=closed&page=1',
      '/api/v1/fees?status=closed&page=1',
    ])
  })
})
