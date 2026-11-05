import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { UserName } from '@/test/msw/fixtures'
import { makeRow } from '@/test/msw/import-fixtures'
import { importRecord, importRequests, seedAmbiguousRow, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

const s = strings.analysis.rows

async function openRows(path: string, as: UserName = 'analyst') {
  const view = renderApp(path, { as })
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
    // Neither the amount nor the currency, which share the Amount column (#132).
    expect(cell(first, s.columns.amount).textContent).toBe('')
  })

  it('an ambiguous row lists the gateways of its candidates and offers viewer no way to choose', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    seedAmbiguousRow(importId)
    await openRows(`/imports/${importId}?step=analysis`, 'viewer')

    const first = bodyRows()[0]!
    expect(cell(first, s.columns.result)).toHaveTextContent('Ambiguous')
    expect(first).toHaveTextContent('Gateway Numeric')
    expect(first).toHaveTextContent('Gateway Shared (another merchant)')
    expect(within(first).queryByRole('button')).not.toBeInTheDocument()
    expect(within(first).queryByRole('combobox')).not.toBeInTheDocument()
  })

  describe('choosing a candidate by status and permission (spec "Fila ambigua sin resolución posible"; D1)', () => {
    it('analyst in analyzed gets one Choose per candidate, the one of another merchant included', async () => {
      const { importId } = seedImport('batch-clean', { status: 'analyzed' })
      const row = seedAmbiguousRow(importId)
      await openRows(`/imports/${importId}?step=analysis`)

      const first = bodyRows()[0]!
      const buttons = within(first).getAllByRole('button')
      expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
        s.choose('Gateway Numeric', row.rowNo, row.sheetName),
        s.choose('Gateway Shared (another merchant)', row.rowNo, row.sheetName),
      ])
      expect(buttons.every((b) => !b.hasAttribute('disabled'))).toBe(true)
      expect(first).not.toHaveTextContent(s.validatedHint)
    })

    it('analyst in validated sees Choose disabled with the reason, and nothing is sent', async () => {
      const { importId } = seedImport('batch-clean', { status: 'validated' })
      seedAmbiguousRow(importId)
      const { user } = await openRows(`/imports/${importId}?step=analysis`)

      const first = bodyRows()[0]!
      const buttons = within(first).getAllByRole('button')
      expect(buttons).toHaveLength(2)
      for (const button of buttons) {
        expect(button).toBeDisabled()
        expect(button).toHaveAccessibleDescription(s.validatedHint)
      }
      await user.click(buttons[0]!)
      expect(importRequests('resolveRow')).toHaveLength(0)
    })

    it('analyst in a cancelled import sees the candidates without any control', async () => {
      const { importId } = seedImport('batch-clean', { status: 'cancelled' })
      seedAmbiguousRow(importId)
      await openRows(`/imports/${importId}?step=analysis`)

      const first = bodyRows()[0]!
      expect(first).toHaveTextContent('Gateway Shared (another merchant)')
      expect(within(first).queryByRole('button')).not.toBeInTheDocument()
    })
  })

  // jsdom does not lay out: whether the browser wraps the name is seen in the screenshots (design D7).
  it('shows the sheet of each row first and its whole file name, without truncate and also as tooltip', async () => {
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
      expect(file).not.toHaveClass('truncate')
      // The cell does not wrap (whitespace-nowrap), and without whitespace-normal overflow-wrap does nothing (#132).
      expect(file).toHaveClass('whitespace-normal')
    }
  })

  // jsdom does not lay out: the widths at 1024 px are measured by the screenshots of web-ambiguous-rows (#132). Here,
  // only that texts may wrap between words in a bounded width and that figures may not wrap at all.
  it('wraps the result and the warnings between words, never the ID nor the amount (#132)', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    importRecord(importId).rows!.push(
      makeRow({
        matchResult: 'unmatched',
        reason: 'id_format',
        transactionId: null,
        transaction: null,
        rowNo: 900,
        transactionIdRaw: '12345678901234567',
        amount: '1234567.8900',
        warnings: ['status_differs_from_sheet', 'cycle_mismatch', 'id_length'],
      }),
    )
    await openRows(`/imports/${importId}?step=analysis&match=unmatched`)

    const row = bodyRows().find((r) => cell(r, s.columns.id).textContent === '12345678901234567')!
    const wrapsBetweenWords = (text: string, where: HTMLElement) => {
      const element = within(where).getByText(text)
      expect(element).toHaveClass('whitespace-normal')
      expect(element.className).toMatch(/\bmax-w-/)
      expect(element.className).not.toMatch(/overflow-wrap:anywhere|break-all/)
    }
    wrapsBetweenWords('Unmatched · ID does not fit any gateway', cell(row, s.columns.result))
    wrapsBetweenWords(
      'Status different from the sheet, Status of another cycle, ID of unusual length',
      cell(row, s.columns.warnings),
    )
    for (const name of [s.columns.id, s.columns.amount]) {
      const where = cell(row, name)
      expect(where).toHaveClass('whitespace-nowrap')
      expect(where.querySelector('.whitespace-normal')).toBeNull()
    }
    expect(cell(row, s.columns.amount).textContent).toBe('1,234,567.8900 USD')
  })

  it('shows the amount and its currency in one column, as one piece that never wraps (#132)', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const unmatched = { matchResult: 'unmatched', reason: 'no_match', transactionId: null, transaction: null } as const
    importRecord(importId).rows!.push(
      makeRow({ ...unmatched, rowNo: 900, transactionIdRaw: '900', amount: '50000.0000', currency: 'EUR' }),
      makeRow({ ...unmatched, rowNo: 901, transactionIdRaw: '901', amount: null, currency: 'EUR' }),
    )
    await openRows(`/imports/${importId}?step=analysis&match=unmatched`)

    expect(column(s.columns.currency)).toBe(-1)
    const byId = (id: string) => bodyRows().find((r) => cell(r, s.columns.id).textContent === id)!
    const amount = cell(byId('900'), s.columns.amount)
    expect(amount.textContent).toBe('50,000.0000 EUR')
    const piece = within(amount).getByText('50,000.0000', { exact: false })
    expect(piece).toHaveClass('whitespace-nowrap')
    expect(piece).toHaveTextContent('50,000.0000 EUR')
    expect(within(piece).getByText('EUR')).toHaveClass('text-muted-foreground')
    expect(amount.querySelector('.whitespace-normal')).toBeNull()
    // Without an amount the currency still shows, as the sheet had it.
    expect(cell(byId('901'), s.columns.amount).textContent).toBe('EUR')
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
