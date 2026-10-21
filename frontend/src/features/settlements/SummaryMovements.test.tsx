import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import {
  failNextSettlement,
  seedMovements,
  seedSettlement,
  settlementMovement,
  settlementRequests,
} from '@/test/msw/settlements'
import { renderApp } from '@/test/render'
import { validatedImport } from '@/test/settlement-screens'
import { OPENING } from '@/test/validation-screens'
import { strings } from './strings'

// Spec settlement "Pantalla Settlement Summary: pestaña Movements" and "abrir el Settlement Summary" (volver a la
// lista), settlements-browse design D8, D10, D11. Counters come from view.movements; nothing is counted here.
process.env.TZ = 'Asia/Tokyo'

const m = strings.movements
const E_MOVEMENTS = Array.from({ length: 450 }, (_, i) =>
  settlementMovement({ settlementTxnId: String(90_000 + i), rowNo: i + 2 }),
)

async function openSummary(search = '', as: 'analyst' | 'viewer' = 'analyst') {
  const { importId } = validatedImport()
  const view = seedSettlement(importId, { batchNo: 123 })
  seedMovements(view.batchId, 'E', E_MOVEMENTS)
  const rendered = renderApp(`/settlements/${view.batchId}${search}`, { as })
  await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' }, OPENING)
  return { ...rendered, view }
}

const transactionsQuery = () =>
  settlementRequests('transactions').map((r) => {
    const q = new URL(r.url, window.location.origin).searchParams
    return `type=${q.get('type')}&page=${q.get('page')}`
  })
const movementsTable = () => within(screen.getByRole('table', { name: m.tableLabel }))
const bodyRows = () => movementsTable().getAllByRole('row').slice(1)

describe('Settlement Summary: the Summary and Movements tabs', () => {
  it('opens on Summary, unchanged, and asks for no movement until Movements is chosen', async () => {
    await openSummary()

    expect(screen.getByRole('tab', { name: strings.summary.tabs.summary })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: strings.summary.tabs.movements })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('table', { name: 'Totals by type' })).toBeInTheDocument()
    expect(settlementRequests('transactions')).toEqual([])
  })

  it('Movements of batch-clean: E first, the counters of the view and the page of the API', async () => {
    const { user, router } = await openSummary()

    await user.click(screen.getByRole('tab', { name: strings.summary.tabs.movements }))

    expect(await screen.findByText(m.pageOf(1, 9, 450))).toBeInTheDocument()
    expect(transactionsQuery()).toEqual(['type=E&page=1'])
    const cycles = within(screen.getByRole('toolbar', { name: m.cycleLabel }))
    expect(cycles.getByRole('button', { name: 'E (450)' })).toHaveAttribute('aria-pressed', 'true')
    expect(cycles.getByRole('button', { name: 'I (10)' })).toHaveAttribute('aria-pressed', 'false')
    expect(cycles.getByRole('button', { name: 'R (320)' })).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(50)
    expect(router.state.location.search).toMatchObject({ tab: 'movements' })
  })

  it('I: status, round and fee of each adjustment, the breakdown of its fees and an excluded amount', async () => {
    const { user, view } = await openSummary()
    seedMovements(view.batchId, 'I', [
      settlementMovement({
        settlementTxnId: '88213',
        sourceTransactionId: '911545598812004',
        cycle: 'I',
        status: 'Chargeback',
        roundNo: 2,
        sheetName: 'CHB',
        rowNo: 2,
        amount: '96.9300',
        excludeAmount: true,
        feeAmount: '45.0000',
        fees: [
          {
            appliedFeeId: '120334',
            feeId: null,
            feeTypeId: 4,
            code: 'Chargeback',
            title: 'Chargeback per txn fee',
            eventDate: null,
            amountUsd: '45.0000',
            configurationSnapshot: null,
          },
        ],
      }),
    ])

    await user.click(screen.getByRole('tab', { name: strings.summary.tabs.movements }))
    await screen.findByText(m.pageOf(1, 9, 450))
    await user.click(screen.getByRole('button', { name: 'I (10)' }))

    await waitFor(() => expect(transactionsQuery().at(-1)).toBe('type=I&page=1'))
    await waitFor(() => expect(bodyRows()).toHaveLength(1))
    const row = within(bodyRows()[0]!)
    expect(row.getByText('911545598812004')).toBeInTheDocument()
    expect(row.getByText('Chargeback')).toBeInTheDocument()
    expect(row.getByText('2')).toBeInTheDocument()
    expect(row.getByText('CHB · 2')).toBeInTheDocument()
    expect(row.getByText(m.excluded)).toBeInTheDocument()
    expect(row.getByText('45.0000')).toBeInTheDocument()
    await user.click(row.getByText(m.feeCount(1)))
    expect(row.getByText('Chargeback per txn fee · 45.0000')).toBeVisible()
  })

  it('fits 1024 px: nine columns, the reserves in one cell with a label per line, amounts and ids on one line', async () => {
    const { user, view } = await openSummary()
    seedMovements(view.batchId, 'R', [
      settlementMovement({
        cycle: 'R',
        reserveHeldAmt: '11.5240',
        reserveReleasedAmt: '7.2500',
        reserveEarlyReleasedAmt: '1.1000',
      }),
    ])

    await user.click(screen.getByRole('tab', { name: strings.summary.tabs.movements }))
    await screen.findByText(m.pageOf(1, 9, 450))
    await user.click(screen.getByRole('button', { name: 'R (320)' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(1))

    const headers = movementsTable().getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual([
      'Transaction',
      'Status',
      'Round',
      'Source row',
      'Event date',
      'Amount',
      'Fees',
      'Reserves',
      'Settled',
    ])
    for (const header of headers) expect(header).toHaveClass('whitespace-normal')
    const cells = within(bodyRows()[0]!).getAllByRole('cell')
    expect(within(cells[0]!).getByText('911545593909470')).toHaveClass('whitespace-nowrap')
    expect(within(cells[5]!).getByText('115.2400')).toHaveClass('whitespace-nowrap')
    expect(within(cells[6]!).getByText('12.0240')).toHaveClass('whitespace-nowrap')
    const reserves = within(cells[7]!).getAllByRole('listitem')
    expect(reserves.map((line) => line.textContent)).toEqual([
      'Held 11.5240',
      'Released 7.2500',
      'Released on chargeback 1.1000',
      'Expected release 2027-03-27 ET',
    ])
    for (const [line, value] of [
      [reserves[0]!, '11.5240'],
      [reserves[1]!, '7.2500'],
      [reserves[2]!, '1.1000'],
    ] as const) {
      expect(within(line).getByText(value)).toHaveClass('whitespace-nowrap')
    }
    for (const cell of cells.slice(1)) expect(cell).toHaveClass('whitespace-normal')
  })

  it('an undated movement, a seeded one without row, Settled from the API and the event date in ET', async () => {
    const { user, view } = await openSummary()
    seedMovements(view.batchId, 'R', [
      settlementMovement({ settlementTxnId: '1', cycle: 'R', eventDate: null, settled: false }),
      settlementMovement({
        settlementTxnId: '2',
        cycle: 'R',
        sheetId: null,
        sheetName: null,
        rowNo: null,
        settled: true,
      }),
    ])

    await user.click(screen.getByRole('tab', { name: strings.summary.tabs.movements }))
    await screen.findByText(m.pageOf(1, 9, 450))
    expect(within(bodyRows()[0]!).getByText('2026-09-28 00:04 ET')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'R (320)' }))

    await waitFor(() => expect(bodyRows()).toHaveLength(2))
    const [undated, seeded] = bodyRows().map((r) => within(r))
    expect(undated!.getByText(m.undated)).toBeInTheDocument()
    expect(undated!.getByText(m.pendingPayment)).toBeInTheDocument()
    expect(seeded!.getByText('—')).toBeInTheDocument()
    expect(seeded!.getByText(m.settled)).toBeInTheDocument()
  })

  it('a reload on Movements keeps the tab, the cycle and the page', async () => {
    await openSummary('?tab=movements&cycle=R&page=2')

    expect(screen.getByRole('tab', { name: strings.summary.tabs.movements })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'R (320)' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(transactionsQuery()).toEqual(['type=R&page=2']))
  })

  it('takes a page past the last one back to the last one, in place, as the list does', async () => {
    const { router } = await openSummary('?tab=movements&page=12')

    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 9 }))
    expect(await screen.findByText(m.pageOf(9, 9, 450))).toBeInTheDocument()
    await waitFor(() => expect(transactionsQuery().at(-1)).toBe('type=E&page=9'))
  })

  it('a failed read of the movements says so with Retry, and Summary is still there', async () => {
    failNextSettlement('transactions')
    const { user } = await openSummary('?tab=movements')

    expect(await screen.findByText(m.loadError)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: strings.retry })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: strings.summary.tabs.summary }))
    expect(await screen.findByRole('table', { name: 'Totals by type' })).toBeInTheDocument()
  })
})

describe('Settlement Summary: back to the list of the account', () => {
  it('Settlements of ProviderA-USD opens the list with the account chosen', async () => {
    const { user, router } = await openSummary()

    await user.click(screen.getByRole('link', { name: strings.summary.backToList('ProviderA-USD') }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/settlements'))
    expect(router.state.location.search).toMatchObject({ accountId: ACCOUNT_IDS['ProviderA-USD'] })
  })
})
