import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  batchCleanPreview,
  type PreviewFixture,
  respondNextSettlement,
  scriptPreview,
  settlementRequests,
} from '@/test/msw/settlements'
import {
  batchNoField,
  chooseDate,
  openReview,
  preSummary,
  previewBodies,
  previewShown,
  processButton,
  validatedImport,
} from '@/test/settlement-screens'

// Spec settlement "Pantalla Settlement Review: batch sin filas asociadas" (#92): only the batch fees will be
// processed, so Process waits for the box; the preview never carries the confirmation, Process adds it.
const NO_ROWS = 'No row of the files matches a transaction of this account: only the batch fees will be processed.'
const WRONG_ACCOUNT = 'The IDs do not fit any gateway of this account: the files may belong to another account.'
const CONFIRM = 'Process a batch with batch fees only'
const REASON = 'Confirm that this batch has batch fees only.'

const details = (likelyWrongAccount: boolean) => ({
  rowsTotal: 12,
  rowsUnmatched: 12,
  unmatchedByReason: likelyWrongAccount
    ? { no_match: 0, id_format: 12, lossy_numeric_id: 0, no_gateways: 0 }
    : { no_match: 12, id_format: 0, lossy_numeric_id: 0, no_gateways: 0 },
  likelyWrongAccount,
})
/** batch-clean's figures without channels to assign, so the only box on screen is the empty batch one. */
const fixture = (emptyBatch: PreviewFixture['emptyBatch']): PreviewFixture => ({
  ...batchCleanPreview(),
  requiresChannelConfirmation: false,
  channelsToAssign: [],
  emptyBatch,
})

async function readyToProcess(emptyBatch: PreviewFixture['emptyBatch']) {
  const ids = validatedImport('batch-clean', fixture(emptyBatch))
  const view = await openReview(ids.importId)
  chooseDate('2026-10-24')
  await previewShown()
  return { ...ids, ...view }
}

const box = () => screen.getByRole('checkbox', { name: CONFIRM })

describe('Settlement Review: a batch without matched rows (spec "batch sin filas asociadas")', () => {
  it('files of another account: both warnings, Process waits for the box, then sends confirmEmptyBatch', async () => {
    const { user } = await readyToProcess(details(true))

    const notice = preSummary().getByRole('region', { name: 'Batch without matched rows' })
    expect(notice).toHaveTextContent(NO_ROWS)
    expect(notice).toHaveTextContent(WRONG_ACCOUNT)
    expect(box()).not.toBeChecked()
    expect(processButton()).toBeDisabled()
    expect(processButton()).toHaveAccessibleDescription(new RegExp(REASON.replace('.', '\\.')))

    await user.click(box())
    expect(processButton()).toBeEnabled()
    await user.click(processButton())

    await waitFor(() => expect(settlementRequests('process')).toHaveLength(1))
    expect(settlementRequests('process')[0]?.body).toMatchObject({ confirmEmptyBatch: true })
    expect(previewBodies().every((body) => !('confirmEmptyBatch' in (body as object)))).toBe(true)
  })

  it('unmatched for another reason: the notice and the box, without the wrong-account warning', async () => {
    await readyToProcess(details(false))

    const notice = preSummary().getByRole('region', { name: 'Batch without matched rows' })
    expect(notice).toHaveTextContent(NO_ROWS)
    expect(notice).not.toHaveTextContent(WRONG_ACCOUNT)
    expect(box()).toBeInTheDocument()
  })

  it('batch-clean has matched rows: no box, no notice, and Process does not carry confirmEmptyBatch', async () => {
    const { user } = await readyToProcess(null)

    expect(screen.queryByRole('checkbox', { name: CONFIRM })).not.toBeInTheDocument()
    await user.click(processButton())

    await waitFor(() => expect(settlementRequests('process')).toHaveLength(1))
    expect(settlementRequests('process')[0]?.body).not.toHaveProperty('confirmEmptyBatch')
  })

  it('409 no_matched_rows says so, unticks the box and asks for a new preview', async () => {
    const { user } = await readyToProcess(details(true))
    await user.click(box())
    const previews = settlementRequests('preview').length
    respondNextSettlement('process', { status: 409, code: 'no_matched_rows', details: details(true) })

    await user.click(processButton())

    expect(
      await screen.findByText('This import has no matched rows. Confirm that the batch has batch fees only.'),
    ).toBeInTheDocument()
    expect(box()).not.toBeChecked()
    await waitFor(() => expect(settlementRequests('preview').length).toBeGreaterThan(previews))
  })

  it('the box is unticked again when a preview stops and then starts asking for it (review-diff #135, point 3)', async () => {
    const { importId } = validatedImport('batch-clean', fixture(null))
    scriptPreview(importId, [fixture(details(true)), fixture(null), fixture(details(true))])
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()
    await user.click(box())
    expect(box()).toBeChecked()

    await user.clear(batchNoField())
    await user.type(batchNoField(), '124')
    await previewShown()
    expect(screen.queryByRole('checkbox', { name: CONFIRM })).not.toBeInTheDocument()

    await user.clear(batchNoField())
    await user.type(batchNoField(), '125')
    await previewShown()
    expect(box()).not.toBeChecked()
    expect(processButton()).toBeDisabled()
  })
})
