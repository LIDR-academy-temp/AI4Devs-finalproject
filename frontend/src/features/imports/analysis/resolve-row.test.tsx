// Resolving an ambiguous row from the rows table (spec "Resolver una fila ambigua desde la pantalla", "Confirmación al
// resolver una fila ambigua" and "Después de resolver una fila ambigua"; web-ambiguous-rows design D2–D4).
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ImportRowItem } from '@/lib/api/types'
import { failNext, holdNext, importRecord, importRequests, seedAmbiguousRow, seedImport } from '@/test/msw/imports'
import { holdNextValidation, seedValidationRun } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

const s = strings.analysis.rows
const c = strings.analysis.counters
const NO_RUN = 'No validation run yet.'

const counter = (name: string) => screen.getByRole('region', { name })
const table = () => screen.getByRole('table', { name: s.title })
const chooseButton = (gateway: string, row: ImportRowItem) =>
  within(table()).getByRole('button', { name: s.choose(gateway, row.rowNo, row.sheetName) })
const dialog = () => screen.getByRole('alertdialog')

/** Opens the analysis of an import with its ambiguous row on screen and the validations read. */
async function open(importId: string, search = '') {
  const view = renderApp(`/imports/${importId}?step=analysis${search}`, { as: 'analyst' })
  await screen.findByRole('table', { name: s.title })
  await waitFor(() => expect(within(table()).getAllByRole('button', { name: /^Choose / }).length).toBeGreaterThan(0))
  return view
}

describe('Resolve an ambiguous row from the table', () => {
  it('choosing and confirming sends the gateway, matches the row and moves the focus to the rows', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    // Row 1 of APP: once matched it is the first row of the Matched filter.
    const row = seedAmbiguousRow(importId, { rowNo: 1 })
    const { user } = await open(importId)
    await screen.findByText(NO_RUN)
    expect(counter(c.ambiguous)).toHaveTextContent('1')

    await user.click(chooseButton('Gateway Numeric', row))
    expect(dialog()).toHaveTextContent(
      s.resolve.body(row.rowNo, row.sheetName, row.transactionIdRaw!, 'Gateway Numeric'),
    )
    expect(dialog()).toHaveTextContent('RAM-01')
    expect(dialog()).not.toHaveTextContent(s.resolve.runWarning)
    // The rows are held after the PATCH, so the Choose is still there when Radix would give the focus back to it:
    // the heading must keep the focus anyway (review 1).
    const rowsHold = holdNext('rows')
    await user.click(within(dialog()).getByRole('button', { name: s.resolve.confirm }))

    await screen.findByText(s.resolve.resolved(row.rowNo, row.sheetName, 'Gateway Numeric'))
    await rowsHold.arrived
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(chooseButton('Gateway Numeric', row)).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: s.title }))
    rowsHold.release()
    expect(importRequests('resolveRow').map((r) => r.body)).toEqual([{ gatewayId: 1 }])
    await waitFor(() => expect(counter(c.ambiguous)).toHaveTextContent('0'))
    await waitFor(() => expect(within(table()).queryByRole('button', { name: /^Choose / })).not.toBeInTheDocument())
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    // The exact element: the heading of the rows, not the Choose that is gone nor the body (review 1).
    const heading = screen.getByRole('heading', { name: s.title })
    expect(heading).toHaveAttribute('data-list-heading')
    await waitFor(() => expect(document.activeElement).toBe(heading))

    // The row itself is now Matched: first of the Matched filter.
    await user.click(screen.getByRole('button', { name: s.filters.matched }))
    await waitFor(() => {
      const first = within(table()).getAllByRole('row')[1]!
      expect(first).toHaveTextContent(row.transactionIdRaw!)
      expect(first).toHaveTextContent(s.results.matched)
      expect(first).not.toHaveTextContent(s.results.ambiguous)
    })
  })

  it('warns that the current run is discarded and, once resolved, there is no run', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    seedValidationRun(importId)
    const row = seedAmbiguousRow(importId)
    const { user } = await open(importId)
    await waitFor(() => expect(screen.queryByText(NO_RUN)).not.toBeInTheDocument())

    await user.click(chooseButton('Gateway Numeric', row))
    expect(dialog()).toHaveTextContent(s.resolve.runWarning)
    await user.click(within(dialog()).getByRole('button', { name: s.resolve.confirm }))

    await screen.findByText(NO_RUN)
    // And the decision asks to validate again before continuing.
    expect(screen.getByText('Run the validations before continuing.')).toBeInTheDocument()
  })

  it('warns as well while the run is not known yet', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const hold = holdNextValidation('get')
    const { user } = await open(importId)
    await hold.arrived

    await user.click(chooseButton('Gateway Numeric', row))
    expect(dialog()).toHaveTextContent(s.resolve.runWarning)
    hold.release()
  })

  it('names a candidate of another merchant without its channel, status or amount, and sends its gateway', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const { user } = await open(importId)

    await user.click(chooseButton('Gateway Shared (another merchant)', row))
    expect(dialog()).toHaveTextContent(
      s.resolve.body(row.rowNo, row.sheetName, row.transactionIdRaw!, 'Gateway Shared (another merchant)'),
    )
    expect(dialog()).not.toHaveTextContent('RAM-')
    expect(dialog()).not.toHaveTextContent('Successful')
    await user.click(within(dialog()).getByRole('button', { name: s.resolve.confirm }))

    await waitFor(() => expect(importRequests('resolveRow').map((r) => r.body)).toEqual([{ gatewayId: 3 }]))
  })

  it('closing with Keep sends nothing and the row stays ambiguous', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const { user } = await open(importId)

    await user.click(chooseButton('Gateway Numeric', row))
    await user.click(within(dialog()).getByRole('button', { name: s.resolve.keep }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(importRequests('resolveRow')).toHaveLength(0)
    expect(chooseButton('Gateway Numeric', row)).toBeEnabled()
    // The focus goes back to the Choose that opened the dialog, not to the body.
    await waitFor(() => expect(document.activeElement).toBe(chooseButton('Gateway Numeric', row)))
  })

  it('closing with Escape sends nothing and gives the focus back to the Choose that opened it', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const { user } = await open(importId)

    await user.click(chooseButton('Gateway Shared (another merchant)', row))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(importRequests('resolveRow')).toHaveLength(0)
    await waitFor(() => expect(document.activeElement).toBe(chooseButton('Gateway Shared (another merchant)', row)))
  })

  it('409 import_not_editable says so with the status and reloads the import: Choose is disabled', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const { user } = await open(importId)

    await user.click(chooseButton('Gateway Numeric', row))
    importRecord(importId).status = 'validated'
    await user.click(within(dialog()).getByRole('button', { name: s.resolve.confirm }))

    await screen.findByText(s.resolve.notEditable('validated'))
    await waitFor(() => expect(chooseButton('Gateway Numeric', row)).toBeDisabled())
  })

  it('409 row_not_ambiguous says so and asks the rows again', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const { user } = await open(importId)

    await user.click(chooseButton('Gateway Numeric', row))
    const stored = importRecord(importId).rows!
    const index = stored.findIndex((r) => r.rowNo === row.rowNo && r.sheetId === row.sheetId)
    stored[index] = { ...stored[index]!, matchResult: 'matched' }
    const rowsBefore = importRequests('rows').length
    const detailBefore = importRequests('detail').length
    // The rows are held, so the Choose is still there when the dialog closes: the heading takes the focus anyway,
    // as the Choose goes once the rows arrive (re-review).
    const rowsHold = holdNext('rows')
    await user.click(within(dialog()).getByRole('button', { name: s.resolve.confirm }))

    await screen.findByText(s.resolve.notAmbiguous)
    await rowsHold.arrived
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(chooseButton('Gateway Numeric', row)).toBeInTheDocument()
    const heading = screen.getByRole('heading', { name: s.title })
    expect(heading).toHaveAttribute('data-list-heading')
    expect(document.activeElement).toBe(heading)
    rowsHold.release()
    await waitFor(() => expect(within(table()).queryByRole('button', { name: /^Choose / })).not.toBeInTheDocument())
    expect(document.activeElement).toBe(heading)
    // Both the rows and the detail are asked again (review 2).
    await waitFor(() => expect(importRequests('rows').length).toBeGreaterThan(rowsBefore))
    await waitFor(() => expect(importRequests('detail').length).toBeGreaterThan(detailBefore))
  })

  it('400 says the gateway is no longer a candidate and asks the rows again', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const { user } = await open(importId)

    await user.click(chooseButton('Gateway Numeric', row))
    // The candidate leaves the stored row, as the API decides with the row's own candidates (review 3).
    const stored = importRecord(importId).rows!.find((r) => r.rowNo === row.rowNo && r.sheetId === row.sheetId)!
    stored.candidates = stored.candidates.filter((c) => c.gatewayId !== 1)
    const rowsBefore = importRequests('rows').length
    // As with row_not_ambiguous: the Choose is still there while the rows are held, and goes after (re-review).
    const rowsHold = holdNext('rows')
    await user.click(within(dialog()).getByRole('button', { name: s.resolve.confirm }))

    await screen.findByText(s.resolve.notCandidate)
    await rowsHold.arrived
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(chooseButton('Gateway Numeric', row)).toBeInTheDocument()
    const heading = screen.getByRole('heading', { name: s.title })
    expect(heading).toHaveAttribute('data-list-heading')
    expect(document.activeElement).toBe(heading)
    rowsHold.release()
    await waitFor(() => expect(importRequests('rows').length).toBeGreaterThan(rowsBefore))
    await waitFor(() =>
      expect(
        within(table()).queryByRole('button', { name: s.choose('Gateway Numeric', row.rowNo, row.sheetName) }),
      ).not.toBeInTheDocument(),
    )
    expect(document.activeElement).toBe(heading)
  })

  it('a network failure gives the generic message', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const { user } = await open(importId)
    failNext('resolveRow', { applied: false })

    await user.click(chooseButton('Gateway Numeric', row))
    await user.click(within(dialog()).getByRole('button', { name: s.resolve.confirm }))

    await screen.findByText(s.resolve.failed)
  })

  it('one write at a time: while the PATCH is on its way, every Choose and the confirm wait', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const { user } = await open(importId)
    const hold = holdNext('resolveRow')

    await user.click(chooseButton('Gateway Numeric', row))
    await user.click(within(dialog()).getByRole('button', { name: s.resolve.confirm }))
    await hold.arrived

    expect(within(dialog()).getByRole('button', { name: s.resolve.confirm })).toBeDisabled()
    // The open dialog is modal: the table behind it is hidden from the accessibility tree.
    const behind = screen.getByRole('table', { name: s.title, hidden: true })
    const chooses = within(behind).getAllByRole('button', { name: /^Choose /, hidden: true })
    expect(chooses).toHaveLength(2)
    for (const button of chooses) expect(button).toBeDisabled()
    hold.release()
    await screen.findByText(s.resolve.resolved(row.rowNo, row.sheetName, 'Gateway Numeric'))
  })

  it('resolving the only row of the last page of Ambiguous goes to the page before', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const rows = Array.from({ length: 51 }, (_, i) => seedAmbiguousRow(importId, { rowNo: 9001 + i }))
    const last = rows.at(-1)!
    const { user, router } = await open(importId, '&match=ambiguous&page=2')

    await user.click(chooseButton('Gateway Numeric', last))
    await user.click(within(dialog()).getByRole('button', { name: s.resolve.confirm }))

    await waitFor(() => expect(router.state.location.search).toMatchObject({ match: 'ambiguous' }))
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('page'))
    await waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(51))
  })
})
