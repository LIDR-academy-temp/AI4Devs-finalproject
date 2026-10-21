import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { businessDate } from '@/lib/format'
import { seedSettlement, settlementRequests } from '@/test/msw/settlements'
import { renderApp } from '@/test/render'
import { chooseDate, openReview, previewShown, processButton, validatedImport } from '@/test/settlement-screens'
import { OPENING } from '@/test/validation-screens'

process.env.TZ = 'Asia/Tokyo'

/** An attempt of batch-clean stored as processed by analyst, and its Summary open. */
async function openSummary(options: Parameters<typeof seedSettlement>[1] = {}) {
  const { importId } = validatedImport()
  const view = seedSettlement(importId, { batchNo: 123, ...options })
  const rendered = renderApp(`/settlements/${view.batchId}`, { as: 'analyst' })
  await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' }, OPENING)
  return { ...rendered, importId, view }
}

const table = (name: string) => within(screen.getByRole('table', { name }))
const header = () => within(screen.getByRole('region', { name: 'Settlement Summary · batch 123' }))
/** The grid of the header as [term, definition] pairs. */
const grid = () =>
  header()
    .getAllByRole('term')
    .map((term) => [term.textContent, term.nextElementSibling?.textContent])
const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent)
/** The Date range cell of each row of Totals by type. */
const totalsRanges = () =>
  table('Totals by type')
    .getAllByRole('row')
    .slice(1)
    .map((row) => cellsOf(row).at(-1))

describe('Settlement Summary: status and header of the attempt (spec "estado y cabecera del intento")', () => {
  it('just processed (HU3 CA6): the attempt, its status, who and when, and nothing Settled', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()
    await user.click(screen.getByRole('checkbox', { name: 'Assign these channels to this account as primary' }))
    await user.click(processButton())

    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' })).toBeInTheDocument()
    expect(grid()).toEqual([
      ['Account', 'ProviderA-USD'],
      ['Batch', '123 · attempt 1'],
      ['Status', 'Processed · pending payment'],
      ['Processed by', 'analyst · 2026-10-19 11:40 ET'],
      ['Settlement date', '2026-10-24'],
    ])
    expect(
      screen.getByText('Movements are not Settled yet: that happens when the batch is marked as paid.'),
    ).toBeInTheDocument()
  })
})

describe('Settlement Summary: header grid of the attempt (spec "estado y cabecera del intento")', () => {
  it('without a settlement date the grid says Not set', async () => {
    await openSummary({ overrides: { settlementDate: null } })

    expect(grid()).toContainEqual(['Settlement date', 'Not set'])
  })

  it('the header has no table of date ranges: they are in Totals by type', async () => {
    await openSummary()

    expect(screen.queryByRole('table', { name: 'Date ranges of this batch' })).not.toBeInTheDocument()
    expect(header().queryByText(/2026-09-28/)).not.toBeInTheDocument()
  })
})

describe('Settlement Summary: totals and an auditable amount payable (spec "totales y amount payable auditable")', () => {
  it('the nine lines in the order of the API with their sign, then the amount payable', async () => {
    await openSummary()

    const rows = table('Amount payable').getAllByRole('row')
    expect(rows.map(cellsOf)).toEqual([
      ['+', 'Deposits', '39,181.0700'],
      ['−', 'Chargebacks', '193.8600'],
      ['−', 'Refunds', '843.9900'],
      ['−', 'RDR', '210.0000'],
      ['−', 'Transaction fees', '4,336.7500'],
      ['−', 'Batch fees', '40.0000'],
      ['−', 'Reserve held', '3,918.1070'],
      ['+', 'Reserve released', '4,314.5455'],
      ['+', 'Reserve released on chargeback', '0.0000'],
      ['', 'Amount payable', '33,952.9085'],
    ])
  })

  it('totals by type with the reserves released, and by brand', async () => {
    await openSummary()

    expect(
      table('Totals by type')
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Type', 'Qty', 'Amount USD', 'Fees USD', 'Date range'])
    expect(table('Totals by type').getAllByRole('row').slice(1).map(cellsOf)).toEqual([
      ['Deposits', '340', '39,181.0700', '4,139.2500', '2026-09-28 – 2026-10-07'],
      ['Declined', '110', '0.0000', '27.5000', '2026-09-28 – 2026-10-07'],
      ['Chargebacks', '2', '193.8600', '90.0000', '2026-09-28 – 2026-10-11'],
      ['Refunds', '6', '843.9900', '30.0000', '2026-09-28 – 2026-10-11'],
      ['RDR', '2', '210.0000', '50.0000', '2026-09-28 – 2026-10-11'],
      ['R · Reserve released', '320', '4,314.5455', '', '2026-09-27 – 2026-10-06'],
    ])
    expect(table('Totals by brand').getAllByRole('row').slice(1).map(cellsOf)).toEqual([
      ['VISA', '204', '23,508.6400'],
      ['MASTERCARD', '136', '15,672.4300'],
    ])
    expect(screen.getByText('E 450 · I 10 · R 320')).toBeInTheDocument()
  })
})

describe('Settlement Summary: date range of each type (spec "totales y amount payable auditable")', () => {
  it('a null range is —', async () => {
    const range = { min: businessDate('2026-09-28T00:04:11.000Z'), max: businessDate('2026-10-07T23:58:40.000Z') }
    await openSummary({ overrides: { dateRanges: { APP: range, DEC: null, I: range, R: null } } })

    expect(totalsRanges()).toEqual([
      '2026-09-28 – 2026-10-07',
      '—',
      '2026-09-28 – 2026-10-07',
      '2026-09-28 – 2026-10-07',
      '2026-09-28 – 2026-10-07',
      '—',
    ])
  })

  it('each date of a range is one piece that never splits, so the cell only wraps at the dash', async () => {
    await openSummary()

    const cell = table('Totals by type').getAllByRole('row')[1]!.lastElementChild as HTMLElement
    expect([...cell.querySelectorAll('.whitespace-nowrap')].map((piece) => piece.textContent)).toEqual([
      '2026-09-28',
      '2026-10-07',
    ])
  })
})

describe('Settlement Summary: fees, reserves, channels and issues (spec "fees, reservas, canales e incidencias")', () => {
  it('a fee adjusted by me (criterion 2 of the issue), the transaction fees and the reserves', async () => {
    await openSummary({
      batchFees: [{ feeTypeId: 121, feeId: null, amount: '30.0000', description: 'Wire Fee', source: 'file' }],
    })

    const fees = within(screen.getByRole('list', { name: 'Batch fees' }))
    expect(fees.getByText('Wire Fee · From file · 30.0000 · entered by analyst')).toBeInTheDocument()
    expect(screen.getByText('Transaction fees: 4,336.7500 · MDR 3,918.1070 (rate 0.100000)')).toBeInTheDocument()
    const reserves = table('Reserves')
    expect(reserves.getAllByRole('row').map(cellsOf)).toEqual([
      ['Held in this batch', '3,918.1070'],
      ['Released (R)', '4,314.5455'],
      ['Released on chargeback', '0.0000'],
    ])
  })

  it('the channels assigned in the attempt', async () => {
    await openSummary()

    expect(screen.getByText('RAM-07 · assigned to this account as primary')).toBeInTheDocument()
  })

  it('the issues of the run, with a link to the Analysis step of the import', async () => {
    const { user, router, importId } = await openSummary({
      overrides: { validationSummary: { runId: 11, persistent: 13, resolved: 2, blocking: 0, resolvedMissing: 4 } },
    })

    expect(
      screen.getByText('13 persistent · 2 resolved · 0 blocking · 4 missing resolved by this batch'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'View the validations' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/imports/${importId}`))
    expect(router.state.location.search).toMatchObject({ step: 'analysis' })
  })

  it('rows not processed and warnings', async () => {
    await openSummary({
      overrides: {
        skipped: { ignored: 3, unmatched: 0, ambiguous: 0, excluded: 0, unresolvedStatus: 0, pending: 0 },
        warnings: [{ code: 'reserve_cap_not_applied' }],
      },
    })

    expect(screen.getByText('Not processed: 3 ignored')).toBeInTheDocument()
    expect(screen.getByText('The reserve cap of the account is not applied yet.')).toBeInTheDocument()
  })
})

describe('Settlement Summary: reload by its link (spec "recarga por su enlace")', () => {
  it('asks for the attempt and shows the same one', async () => {
    const { view } = await openSummary()

    expect(settlementRequests('get')).toHaveLength(1)
    expect(settlementRequests('get')[0]!.url).toBe(`/api/v1/settlements/${view.batchId}`)
  })

  it('an unknown attempt: Settlement not found with a link to Dashboard', async () => {
    renderApp('/settlements/5c3f9e21-0000-4000-8000-000000000999', { as: 'analyst' })

    expect(await screen.findByRole('heading', { name: 'Settlement not found' }, OPENING)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/')
  })
})

describe('Settlement Summary: dates in New York time (spec "fechas en hora de Nueva York")', () => {
  it('business dates as they arrive and the audit instant converted, whatever the zone of the browser', async () => {
    await openSummary({ settlementDate: '2026-10-24' })

    expect(grid()).toContainEqual(['Settlement date', '2026-10-24'])
    expect(totalsRanges()[0]).toBe('2026-09-28 – 2026-10-07')
    expect(grid()).toContainEqual(['Processed by', 'analyst · 2026-10-19 11:40 ET'])
  })
})
