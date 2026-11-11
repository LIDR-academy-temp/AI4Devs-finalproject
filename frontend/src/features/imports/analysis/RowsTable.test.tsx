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

/**
 * The file of a row in one line at the foot of the row (web-analysis-polish design D5). jsdom does not lay out, so
 * these are the classes that do it: every cell of the row reserves a band of one line at its foot, the row is the box
 * the file is placed against, and the file sits in that band, in one line cut with "…" if longer than the row; the
 * screenshots measure that it overlaps nothing.
 */
function expectFileAtFoot(row: HTMLElement) {
  const file = within(cell(row, s.columns.file)).getByTitle(/.+/)
  expect(file).toHaveAttribute('title', file.textContent)
  expect(file).toHaveClass('absolute', 'bottom-2', 'truncate')
  expect(file).not.toHaveClass('whitespace-normal')
  expect(file.className).not.toMatch(/overflow-wrap/)
  expect(row).toHaveClass('relative')
  for (const td of cellsOf(row)) expect(td).toHaveClass('pb-6')
  return file
}

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

  it('an invalid filter and page in the address are dropped from the query too (#110)', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    await openRows(`/imports/${importId}?step=analysis&match=weird&page=abc`)

    expect(importRequests('rows').map((r) => r.url)).toEqual([`/api/v1/imports/${importId}/rows?page=1&pageSize=50`])
    expect(bodyRows()).toHaveLength(50)
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
  it('shows the sheet and row of each row in one line, then its whole file name, also as tooltip', async () => {
    const { importId } = seedImport('batch-split', { status: 'analyzed' })
    await openRows(`/imports/${importId}?step=analysis`)

    // The row number is not a column of its own (web-rows-table-compact D1).
    const headers = within(screen.getByRole('table', { name: s.title })).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).not.toContain('Row')

    const sheets = new Set(importRecord(importId).files.flatMap((f) => f.sheets.map((x) => x.template.sheetName)))
    const lines: string[] = []
    for (const row of bodyRows()) {
      const where = cell(row, 'Sheet · file')
      // The first line: the sheet in an element of its own (the screenshot script reads it), then its row.
      const line = where.firstElementChild!.firstElementChild as HTMLElement
      const sheet = where.querySelector('span')!
      expect(sheets.has(sheet.textContent ?? '')).toBe(true)
      expect(sheet).not.toHaveClass('truncate')
      expect(line.textContent).toMatch(new RegExp(`^${sheet.textContent} · row \\d+$`))
      lines.push(line.textContent ?? '')

      // Then the whole name of the file in one line, below everything else in the row (web-analysis-polish D5).
      const file = expectFileAtFoot(row)
      expect(file.textContent).toMatch(/^Recon_Template_ProviderA-USD_batch-split_part[12]\.xlsx$/)
    }
    expect(lines[0]).toBe('APP · row 2')
  })

  it('reserves the band of the file only in the rows of data, never in the header row', async () => {
    const { importId } = seedImport('batch-split', { status: 'analyzed' })
    await openRows(`/imports/${importId}?step=analysis`)

    const header = within(screen.getByRole('table', { name: s.title })).getAllByRole('row')[0]!
    expect(header).not.toHaveClass('relative')
    for (const th of within(header).getAllByRole('columnheader')) expect(th).not.toHaveClass('pb-6')
    for (const row of bodyRows()) expect(row).toHaveClass('relative')
  })

  // The tallest cell of the table: candidates and their Choose also end above the band of the file (design D5).
  it('keeps the file below the candidates and the Choose of an ambiguous row', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    seedAmbiguousRow(importId)
    await openRows(`/imports/${importId}?step=analysis`)

    const first = bodyRows()[0]!
    expect(within(cell(first, s.columns.result)).getAllByRole('button')).toHaveLength(2)
    expectFileAtFoot(first)
  })

  // A legacy file names its sheets freely (Excel allows 31 characters). jsdom does not lay out, so these are the
  // classes that keep such a name inside the fixed width instead of painting it over the ID (design D3).
  it('wraps a long legacy sheet name inside the fixed width and never parts "row" from its number', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const longName = 'Transactions approved by issuer'
    importRecord(importId).rows!.push(
      makeRow({
        matchResult: 'unmatched',
        reason: 'no_match',
        transactionId: null,
        transaction: null,
        sheetName: longName,
        rowNo: 1234,
        transactionIdRaw: '900',
      }),
    )
    await openRows(`/imports/${importId}?step=analysis&match=unmatched`)

    const where = cell(bodyRows().find((r) => cell(r, s.columns.id).textContent === '900')!, s.columns.file)
    // The width stays fixed: a wider cell would bring back the overflow at 1024 px (#132).
    const box = where.firstElementChild as HTMLElement
    expect(box).toHaveClass('w-28')
    expect(box.className).not.toMatch(/\bmin-w-/)

    const line = box.firstElementChild as HTMLElement
    expect(line.textContent).toBe(`${longName} · row 1234`)
    // The space between the sheet and its row is a place to wrap too: the line does not inherit nowrap from the cell.
    expect(line).toHaveClass('whitespace-normal')
    expect(line).not.toHaveClass('whitespace-nowrap')

    const sheet = within(line).getByText(longName)
    expect(sheet).toHaveClass('whitespace-normal', 'break-words')
    const rowNo = within(line).getByText('· row 1234')
    expect(rowNo).toHaveClass('whitespace-nowrap')
    // The sheet wraps in flow; the file stays at the foot of the row, below it (web-analysis-polish design D5).
    expectFileAtFoot(bodyRows().find((r) => cell(r, s.columns.id).textContent === '900')!)
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
      expect(element.className).not.toMatch(/overflow-wrap:anywhere|break-all/)
      return element
    }
    // The result wraps in the fixed width of its container, shared with the candidates.
    const result = wrapsBetweenWords('Unmatched · ID does not fit any gateway', cell(row, s.columns.result))
    expect(result.parentElement).toHaveClass('w-24')
    const warnings = wrapsBetweenWords(
      'Status different from the sheet, Status of another cycle, ID of unusual length',
      cell(row, s.columns.warnings),
    )
    expect(warnings).toHaveClass('max-w-40')
    // Checked on the element that holds the figure: every TableCell already has whitespace-nowrap.
    const id = cell(row, s.columns.id)
    expect(within(id).getByText('12345678901234567')).toHaveClass('whitespace-nowrap')
    expect(id.querySelector('.whitespace-normal')).toBeNull()
    const amount = cell(row, s.columns.amount)
    expect(within(amount).getByText('1,234,567.8900', { exact: false })).toHaveClass('whitespace-nowrap')
    expect(amount.querySelector('.whitespace-normal')).toBeNull()
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

    const headers = within(screen.getByRole('table', { name: s.title })).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).not.toContain('Currency')
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

// jsdom does not lay out: the widths at 1280 and 1024 px are measured by the screenshots of web-analysis-guardrails.
// Here, only where the ID may break: after each hyphen and nowhere else.
describe('Analysis: ID with hyphens (spec "Resultado del análisis: ID con guiones en la tabla de filas")', () => {
  const unmatched = { matchResult: 'unmatched', reason: 'id_format', transactionId: null, transaction: null } as const
  const idPiece = (id: string) => {
    const row = bodyRows().find((r) => cell(r, s.columns.id).textContent === id)!
    return within(cell(row, s.columns.id)).getByText(
      (_, element) => element?.tagName === 'SPAN' && element.textContent === id,
    )
  }

  it('an ID with hyphens may break only after each hyphen, and copies whole', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    importRecord(importId).rows!.push(
      makeRow({ ...unmatched, rowNo: 900, transactionIdRaw: 'df14616d-4b26-4ffb-9984-72717ebff6a6' }),
    )
    await openRows(`/imports/${importId}?step=analysis&match=unmatched`)

    const piece = idPiece('df14616d-4b26-4ffb-9984-72717ebff6a6')
    expect(piece).toHaveClass('whitespace-normal', 'font-mono')
    expect(piece).not.toHaveClass('whitespace-nowrap')
    expect(piece.className).not.toMatch(/overflow-wrap|break-all|break-words/)
    // <wbr> is a break opportunity that adds no character: the text, and so the copy, is the ID as read.
    expect(piece.innerHTML).toBe('df14616d-<wbr>4b26-<wbr>4ffb-<wbr>9984-<wbr>72717ebff6a6')
    expect(piece.textContent).toBe('df14616d-4b26-4ffb-9984-72717ebff6a6')
    // A wrapped ID grows the row; the file stays at its foot, below the last line of the ID (web-analysis-polish D5).
    expectFileAtFoot(bodyRows().find((r) => cell(r, s.columns.id).textContent === piece.textContent)!)
  })

  it('an ID without hyphens never breaks', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    importRecord(importId).rows!.push(makeRow({ ...unmatched, rowNo: 900, transactionIdRaw: '12345678901234567' }))
    await openRows(`/imports/${importId}?step=analysis&match=unmatched`)

    const piece = idPiece('12345678901234567')
    expect(piece).toHaveClass('whitespace-nowrap', 'font-mono')
    expect(piece.innerHTML).toBe('12345678901234567')
  })
})
