import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  batchCleanPreview,
  failNextSettlement,
  holdNextSettlement,
  respondNextSettlement,
  settlementRequests,
} from '@/test/msw/settlements'
import {
  AFTER_DEBOUNCE,
  batchNoField,
  chooseDate,
  dateField,
  openReview,
  payableRow,
  preSummary,
  previewBodies,
  previewShown,
  processButton,
  validatedImport,
} from '@/test/settlement-screens'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** The batch-clean fixture with its payable lines changed (amounts only; the fake never sums). */
function withLines(amounts: Partial<Record<string, string>>) {
  const fixture = batchCleanPreview()
  return {
    ...fixture,
    payableBreakdown: fixture.payableBreakdown.map((l) => ({ ...l, amount: amounts[l.code] ?? l.amount })),
  }
}

describe('Settlement Review: settlement date (spec "fecha de liquidación")', () => {
  it('at opening: the date is empty with its reason, no preview, and Process says why', async () => {
    const { importId } = validatedImport()
    await openReview(importId)

    expect(dateField()).toHaveValue('')
    expect(screen.getAllByText('Choose the settlement date.').length).toBeGreaterThan(0)
    expect(preSummary().getByText('Choose the settlement date to see the pre-summary.')).toBeInTheDocument()
    expect(processButton()).toBeDisabled()
    expect(processButton()).toHaveAccessibleDescription(/Choose the settlement date\./)
    await wait(AFTER_DEBOUNCE)
    expect(settlementRequests('preview')).toHaveLength(0)
  })

  it('cleared after a preview: the error in the field, the pre-summary out of date and Process disabled', async () => {
    const { importId } = validatedImport()
    await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()

    chooseDate('')

    expect(await preSummary().findByText('Updating the pre-summary…')).toBeInTheDocument()
    expect(processButton()).toBeDisabled()
    expect(processButton()).toHaveAccessibleDescription(/Choose the settlement date\./)
  })
})

describe('Settlement Review: pre-summary (spec "resumen previo")', () => {
  it('batch-clean: the reviewed run, the date and the file fees, and every figure as the API sends it', async () => {
    const { importId, runId } = validatedImport()
    await openReview(importId)

    chooseDate('2026-10-24')
    await previewShown()

    expect(previewBodies()).toEqual([
      {
        runId,
        batchNo: 123,
        settlementDate: '2026-10-24',
        batchFees: [
          { feeTypeId: 121, feeId: null, amount: '25.0000', description: 'Wire Fee', source: 'file' },
          { feeTypeId: 117, feeId: null, amount: '15.0000', description: 'Settlement Fee', source: 'file' },
        ],
      },
    ])
    const panel = preSummary()
    expect(panel.getByText('E 450 · I 10 · R 320')).toBeInTheDocument()
    const totals = within(panel.getByRole('table', { name: 'Totals by type' }))
    expect(totals.getAllByRole('row')).toHaveLength(6)
    expect(totals.getByRole('row', { name: /Deposits/ })).toHaveTextContent('Deposits34039,181.07004,139.2500')
    expect(payableRow('Deposits')).toEqual(['+', 'Deposits', '39,181.0700'])
    expect(payableRow('Chargebacks')).toEqual(['−', 'Chargebacks', '193.8600'])
    expect(payableRow('Batch fees')).toEqual(['−', 'Batch fees', '40.0000'])
    expect(payableRow('Reserve released')).toEqual(['+', 'Reserve released', '4,314.5455'])
    expect(payableRow('Reserve released on chargeback')).toEqual(['+', 'Reserve released on chargeback', '0.0000'])
    const lines = within(panel.getByRole('table', { name: 'Amount payable' })).getAllByRole('row')
    expect(lines.map((r) => within(r).getAllByRole('cell')[1]!.textContent)).toEqual([
      'Deposits',
      'Chargebacks',
      'Refunds',
      'RDR',
      'Transaction fees',
      'Batch fees',
      'Reserve held',
      'Reserve released',
      'Reserve released on chargeback',
      'Amount payable',
    ])
    expect(payableRow('Amount payable')).toEqual(['', 'Amount payable', '33,952.9085'])
  })

  it('rows not processed: only the reasons other than zero', async () => {
    const { importId } = validatedImport('batch-clean', {
      ...batchCleanPreview(),
      skipped: { ignored: 3, unmatched: 0, ambiguous: 0, excluded: 2, unresolvedStatus: 0, pending: 0 },
    })
    await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()

    expect(preSummary().getByText('Not processed: 3 ignored · 2 excluded')).toBeInTheDocument()
  })

  it('warnings with their texts', async () => {
    const { importId } = validatedImport('batch-clean', {
      ...batchCleanPreview(),
      warnings: [
        { code: 'undated_adjustment', transactionId: '441706751475644', sheetId: 's-1', rowNo: 4, feeSkipped: false },
        { code: 'reserve_cap_not_applied' },
      ],
    })
    await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()

    expect(
      preSummary().getByText('Adjustment 441706751475644 has no event date: it is processed without one.'),
    ).toBeInTheDocument()
    expect(preSummary().getByText('The reserve cap of the account is not applied yet.')).toBeInTheDocument()
  })

  it('a preview whose payable does not add up: the amount of the API, not corrected', async () => {
    const { importId } = validatedImport('batch-clean', { ...batchCleanPreview(), amountPayable: '1.0000' })
    await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()

    expect(payableRow('Amount payable')).toEqual(['', 'Amount payable', '1.0000'])
  })

  it('a negative batch fees line keeps its sign in its own column and its amount as sent', async () => {
    const { importId } = validatedImport('batch-clean', withLines({ batch_fees: '-42.5000' }))
    await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()

    expect(payableRow('Batch fees')).toEqual(['−', 'Batch fees', '-42.5000'])
  })

  it('409 validation_run_superseded: says so with a link to the Analysis step, and Process is disabled', async () => {
    const { importId, runId } = validatedImport()
    respondNextSettlement('preview', {
      status: 409,
      code: 'validation_run_superseded',
      details: { runId, currentRunId: runId + 1 },
    })
    await openReview(importId)
    chooseDate('2026-10-24')

    expect(
      await preSummary().findByText(
        'A newer validation run exists. Review it before processing.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(preSummary().getByRole('link', { name: 'Go to the Analysis step' })).toBeInTheDocument()
    expect(processButton()).toBeDisabled()
  })

  it('a network failure: says so and Retry asks again', async () => {
    const { importId } = validatedImport()
    failNextSettlement('preview')
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')

    await user.click(await preSummary().findByRole('button', { name: 'Retry' }, { timeout: 3000 }))

    await previewShown()
    expect(settlementRequests('preview')).toHaveLength(2)
  })
})

describe('Settlement Review: pre-summary up to date (spec "resumen previo al día")', () => {
  it('changes in a row: one request, and meanwhile the pre-summary is out of date and Process waits', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()
    const before = settlementRequests('preview').length

    await user.clear(batchNoField())
    await user.type(batchNoField(), '124')

    expect(preSummary().getByText('Updating the pre-summary…')).toBeInTheDocument()
    expect(processButton()).toBeDisabled()
    expect(processButton()).toHaveAccessibleDescription(/Waiting for the pre-summary\./)
    await previewShown()
    const sent = previewBodies().slice(before) as { batchNo: number }[]
    expect(sent.map((b) => b.batchNo)).toEqual([124])
  })

  it('an answer out of order is not painted: the screen keeps the latest', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)
    const held = holdNextSettlement('preview')
    chooseDate('2026-10-24')
    await held.arrived

    await user.clear(batchNoField())
    await user.type(batchNoField(), '124')
    await waitFor(() => expect(settlementRequests('preview')).toHaveLength(2))
    await previewShown()
    expect(processButton()).toHaveAccessibleName('Process batch 124')

    held.release()
    await wait(100)
    expect(processButton()).toHaveAccessibleName('Process batch 124')
    expect(preSummary().queryByText('Updating the pre-summary…')).not.toBeInTheDocument()
  })
})
