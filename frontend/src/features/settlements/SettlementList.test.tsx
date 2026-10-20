import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { strings as accountStrings } from '@/features/accounts/strings'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import {
  accountSettlement,
  failNextSettlement,
  paidHistory,
  respondNextSettlement,
  seedAccountSettlements,
  seedSettlement,
  settlementRequests,
} from '@/test/msw/settlements'
import { renderApp } from '@/test/render'
import { validatedImport } from '@/test/settlement-screens'
import { OPENING } from '@/test/validation-screens'
import { strings } from './strings'

// Spec settlement "Pantalla Settlement List: columnas", "filtros y paginación", "abrir el Settlement Summary" and
// "carga y errores" (settlements-browse design D7, D9, D14). The fake only pages: the filters are checked on the query.
process.env.TZ = 'Asia/Tokyo'

const s = strings.list
const USD = ACCOUNT_IDS['ProviderA-USD']

async function openList(search = '', as: 'analyst' | 'viewer' = 'analyst') {
  const rendered = renderApp(`/settlements?accountId=${USD}${search}`, { as })
  await screen.findByRole('table', { name: s.tableLabel }, OPENING)
  return rendered
}

const bodyRows = () =>
  within(screen.getByRole('table', { name: s.tableLabel }))
    .getAllByRole('row')
    .slice(1)
const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent)
const batchNos = () => bodyRows().map((row) => within(row).getAllByRole('cell')[0]!.textContent)

/** The query of the last request of the list, as the screen sent it. */
function lastQuery(): Record<string, string> {
  const url = settlementRequests('accountSettlements').at(-1)!.url
  return Object.fromEntries(new URL(url, window.location.origin).searchParams)
}

const day = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('Settlement List: columns', () => {
  it('shows batch 122 first with its attempt, status, dates in ET, processed by, amount and channels', async () => {
    seedAccountSettlements(USD, paidHistory(USD, 22))
    await openList()

    expect(cellsOf(bodyRows()[0]!)).toEqual([
      '122',
      '1',
      'Paid',
      '2026-10-02 ET',
      'analyst · 2026-09-30 11:40 ET',
      '30,122.4500',
      'RAM-01,RAM-02',
    ])
    const amount = within(bodyRows()[0]!).getAllByRole('cell')[5]!
    expect(amount).toHaveClass('text-right')
    expect(bodyRows()).toHaveLength(20)
  })

  it('says Not set without a settlement date, groups a 15-digit amount without a number and dims an undone attempt', async () => {
    seedAccountSettlements(USD, [
      accountSettlement({ batchNo: 124, settlementDate: null, amountPayable: '123456789012345.1234' }),
      accountSettlement({ batchNo: 118, attemptNo: 1, status: 'undone', settledStatus: 'undone' }),
    ])
    await openList()

    const [unset, undone] = bodyRows()
    expect(cellsOf(unset!)[3]).toBe(s.notSet)
    expect(cellsOf(unset!)[5]).toBe('123,456,789,012,345.1234')
    expect(cellsOf(undone!)[2]).toBe('Undone')
    expect(undone).toHaveAttribute('data-undone', 'true')
    expect(undone).toHaveClass('text-muted-foreground')
    expect(unset).not.toHaveAttribute('data-undone')
  })
})

describe('Settlement List: filters and pages', () => {
  it('filters by Paid from page 1 and writes it to the address', async () => {
    seedAccountSettlements(USD, paidHistory(USD, 22))
    const { user, router } = await openList('&page=2')
    expect(lastQuery()).toMatchObject({ page: '2', pageSize: '20' })

    await user.selectOptions(screen.getByLabelText(s.status), s.statuses.paid)

    await waitFor(() => expect(lastQuery()).toMatchObject({ status: 'paid', page: '1' }))
    expect(router.state.location.search).toMatchObject({ status: 'paid' })
    expect(router.state.location.search).not.toHaveProperty('page')
  })

  it('sends From and To as typed, without a date field by default', async () => {
    seedAccountSettlements(USD, paidHistory(USD, 3))
    const { router } = await openList()

    day(s.from, '2026-09-01')
    day(s.to, '2026-09-30')

    await waitFor(() => expect(lastQuery()).toMatchObject({ from: '2026-09-01', to: '2026-09-30' }))
    expect(lastQuery()).not.toHaveProperty('dateField')
    expect(router.state.location.search).toMatchObject({ from: '2026-09-01', to: '2026-09-30' })
  })

  it('filters by the processed day in ET, and keeps it after a reload', async () => {
    seedAccountSettlements(USD, paidHistory(USD, 3))
    const { user, router } = await openList()

    await user.selectOptions(screen.getByLabelText(s.dateField), s.dateFields.processedAt)
    day(s.from, '2026-10-20')

    await waitFor(() => expect(lastQuery()).toMatchObject({ dateField: 'processedAt', from: '2026-10-20', page: '1' }))
    expect(router.state.location.search).toMatchObject({ dateField: 'processedAt', from: '2026-10-20' })
  })

  it('restores the processed day from the address', async () => {
    seedAccountSettlements(USD, paidHistory(USD, 3))
    await openList('&dateField=processedAt&from=2026-10-20')

    expect(screen.getByLabelText(s.dateField)).toHaveValue('processedAt')
    expect(screen.getByLabelText(s.from)).toHaveValue('2026-10-20')
    expect(lastQuery()).toMatchObject({ dateField: 'processedAt', from: '2026-10-20' })
  })

  it('warns in the field about a reversed range and does not ask for the list', async () => {
    seedAccountSettlements(USD, paidHistory(USD, 3))
    await openList()
    const before = settlementRequests('accountSettlements').length

    day(s.from, '2026-10-24')
    day(s.to, '2026-10-01')

    expect(await screen.findByText(s.reversedRange)).toBeInTheDocument()
    expect(screen.getByLabelText(s.from)).toHaveAttribute('aria-invalid', 'true')
    expect(settlementRequests('accountSettlements').filter((r) => r.url.includes('to=2026-10-01'))).toEqual([])
    expect(settlementRequests('accountSettlements').length).toBeLessThanOrEqual(before + 1)
  })

  it('pages 22 attempts in two pages of 20; Next is disabled on the last one with its reason', async () => {
    seedAccountSettlements(USD, paidHistory(USD, 22))
    const { user } = await openList()
    expect(screen.getByText(s.pageOf(1, 2, 22))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: s.next }))

    expect(await screen.findByText(s.pageOf(2, 2, 22))).toBeInTheDocument()
    await waitFor(() => expect(batchNos()).toEqual(['102', '101']))
    const next = screen.getByRole('button', { name: s.next })
    expect(next).toBeDisabled()
    expect(next).toHaveAccessibleDescription(s.lastPage)
    expect(screen.getByRole('button', { name: s.previous })).toBeEnabled()
  })

  it('says so when the filters leave nothing', async () => {
    seedAccountSettlements(USD, [])
    await openList('&status=undone')

    expect(await screen.findByText(s.empty)).toBeInTheDocument()
  })
})

describe('Settlement List: loading and errors', () => {
  it('shows the error with Retry and keeps the filters in the address', async () => {
    seedAccountSettlements(USD, paidHistory(USD, 3))
    failNextSettlement('accountSettlements')
    const { user, router } = renderApp(`/settlements?accountId=${USD}&status=paid`, { as: 'analyst' })

    expect(await screen.findByText(s.loadError, undefined, OPENING)).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ status: 'paid' })
    await user.click(screen.getByRole('button', { name: strings.retry }))

    await waitFor(() => expect(batchNos()).toEqual(['122', '121', '120']))
  })

  it('says the account is not available when the list answers 404', async () => {
    respondNextSettlement('accountSettlements', { status: 404, code: 'not_found', message: 'Account not found' })
    renderApp(`/settlements?accountId=${USD}`, { as: 'analyst' })

    expect(await screen.findByText(accountStrings.picker.notAvailable, undefined, OPENING)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: s.tableLabel })).not.toBeInTheDocument()
  })
})

describe('Settlement List: opening the Settlement Summary', () => {
  it('Batch 122 · attempt 1 opens its Summary, paid', async () => {
    const { importId } = validatedImport()
    const view = seedSettlement(importId, {
      batchNo: 122,
      overrides: { status: 'paid', settledStatus: 'settled' },
    })
    seedAccountSettlements(USD, [accountSettlement({ batchId: view.batchId, importId, batchNo: 122 })])
    const { user, router } = await openList()

    await user.click(screen.getByRole('link', { name: s.batchLink(122, 1) }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/settlements/${view.batchId}`))
    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 122' })).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.queryByText(strings.summary.notSettled)).not.toBeInTheDocument()
  })
})
