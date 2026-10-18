import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeRow } from '@/test/msw/import-fixtures'
import { importRecord, importRequests, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

const s = strings.analysis.rows

async function openRows(path: string) {
  const view = renderApp(path, { as: 'analyst' })
  const table = await screen.findByRole('table', { name: s.title })
  await waitFor(() => expect(within(table).getAllByRole('row').length).toBeGreaterThan(1))
  return view
}

const bodyRows = () =>
  within(screen.getByRole('table', { name: s.title }))
    .getAllByRole('row')
    .slice(1)
const cellsOf = (row: HTMLElement) => within(row).getAllByRole('cell')
const column = (name: string) =>
  within(screen.getByRole('table', { name: s.title }))
    .getAllByRole('columnheader')
    .findIndex((h) => h.textContent === name)
const cell = (row: HTMLElement, name: string) => cellsOf(row)[column(name)]!

describe('Analysis: rows table (spec "Resultado del análisis: tabla de filas")', () => {
  it('batch-issues shows the unmatched row first and 770 rows in the pagination', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    await openRows(`/imports/${importId}?step=analysis`)

    const first = bodyRows()[0]!
    expect(cell(first, s.columns.id)).toHaveTextContent('4260465812403708')
    expect(cell(first, s.columns.result)).toHaveTextContent('Unmatched · No match')
    expect(screen.getByText(s.pageOf(1, 16, 770))).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(50)
  })

  it('filter and page come from the address: matched page 16 of batch-clean has 30 rows', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    await openRows(`/imports/${importId}?step=analysis&match=matched&page=16`)

    expect(bodyRows()).toHaveLength(30)
    expect(bodyRows().every((r) => cell(r, s.columns.result).textContent === 'Matched')).toBe(true)
    expect(importRequests('rows').map((r) => r.url)).toContain(
      `/api/v1/imports/${importId}/rows?match=matched&page=16&pageSize=50`,
    )
    expect(screen.getByRole('button', { name: s.filters.matched })).toHaveAttribute('aria-pressed', 'true')
  })

  it('choosing a filter and the next page goes to the address', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const { user, router } = await openRows(`/imports/${importId}?step=analysis`)

    await user.click(screen.getByRole('button', { name: s.filters.ignored }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ match: 'ignored' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(3))

    await user.click(screen.getByRole('button', { name: s.filters.matched }))
    await user.click(screen.getByRole('button', { name: s.next }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ match: 'matched', page: 2 }))
  })

  it('the Unmatched counter link applies the filter', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { user, router } = await openRows(`/imports/${importId}?step=analysis`)

    await user.click(
      screen.getByRole('link', { name: strings.analysis.counters.showRows(strings.analysis.counters.unmatched) }),
    )

    await waitFor(() => expect(router.state.location.search).toMatchObject({ match: 'unmatched' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(1))
  })

  it('a row of another merchant is Matched with its warning and without channel nor amount', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const record = importRecord(importId)
    const app = record.files[0]!.sheets[0]!
    record.rows!.push(
      makeRow({
        fileId: record.files[0]!.fileId,
        sheetId: app.sheetId,
        rowNo: 1,
        transactionIdRaw: '111111111111111',
        transaction: null,
        warnings: ['out_of_scope_transaction'],
      }),
    )
    await openRows(`/imports/${importId}?step=analysis&match=matched`)

    const first = bodyRows()[0]!
    expect(cell(first, s.columns.id)).toHaveTextContent('111111111111111')
    expect(cell(first, s.columns.result)).toHaveTextContent('Matched')
    expect(cell(first, s.columns.warnings)).toHaveTextContent('Transaction of another merchant')
    expect(cell(first, s.columns.channel).textContent).toBe('')
    expect(cell(first, s.columns.amount).textContent).toBe('')
  })

  it('an ambiguous row lists the gateways of its candidates and offers no way to choose', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    importRecord(importId).rows!.push(
      makeRow({
        matchResult: 'ambiguous',
        transactionId: null,
        gatewayId: null,
        transaction: null,
        transactionIdRaw: '222222222222222',
        candidates: [
          {
            gatewayId: 1,
            gatewayName: 'Gateway Numeric',
            transactionId: '9001',
            channelId: 1001,
            channelName: 'RAM-01',
            statusId: 2,
            statusName: 'Successful',
            amount: '10.0000',
          },
          {
            gatewayId: 3,
            gatewayName: 'Gateway Shared',
            transactionId: '9002',
            channelId: null,
            channelName: null,
            statusId: null,
            statusName: null,
            amount: null,
            outOfScope: true,
          },
        ],
      }),
    )
    await openRows(`/imports/${importId}?step=analysis`)

    const first = bodyRows()[0]!
    expect(cell(first, s.columns.result)).toHaveTextContent('Ambiguous')
    expect(first).toHaveTextContent('Gateway Numeric')
    expect(first).toHaveTextContent('Gateway Shared (another merchant)')
    expect(within(first).queryByRole('button')).not.toBeInTheDocument()
    expect(within(first).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows the sheet of each row first and its file truncated with the whole name as tooltip', async () => {
    const { importId } = seedImport('batch-split', { status: 'analyzed' })
    await openRows(`/imports/${importId}?step=analysis`)

    const sheets = new Set(importRecord(importId).files.flatMap((f) => f.sheets.map((x) => x.template.sheetName)))
    for (const row of bodyRows()) {
      const where = cell(row, 'Sheet · file')
      const [sheet, file] = Array.from(where.querySelectorAll('span'))
      expect(sheets.has(sheet!.textContent ?? '')).toBe(true)
      expect(sheet).not.toHaveClass('truncate')
      expect(file!.textContent).toMatch(/^Recon_Template_ProviderA-USD_batch-split_part[12]\.xlsx$/)
      expect(file).toHaveAttribute('title', file!.textContent)
      expect(file).toHaveClass('truncate')
    }
  })

  it('shows a 17-digit ID and a UUID whole', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const unmatched = { matchResult: 'unmatched', reason: 'no_match', transactionId: null, transaction: null } as const
    importRecord(importId).rows!.push(
      makeRow({ ...unmatched, rowNo: 900, transactionIdRaw: '12345678901234567' }),
      makeRow({ ...unmatched, rowNo: 901, transactionIdRaw: 'df14616d-4b26-4ffb-9984-72717ebff6a6' }),
    )
    await openRows(`/imports/${importId}?step=analysis`)

    const [first, second] = bodyRows()
    expect(cell(first!, s.columns.id).textContent).toBe('12345678901234567')
    expect(cell(second!, s.columns.id).textContent).toBe('df14616d-4b26-4ffb-9984-72717ebff6a6')
  })
})
