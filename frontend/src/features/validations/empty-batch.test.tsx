import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import { respondNext, seedValidationRun, validationRequests } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

process.env.TZ = 'Asia/Tokyo'

// Spec validation "Pantalla Analysis & Validations: batch sin filas asociadas" (#92): a batch with batch fees only is
// legitimate, so continuing is not blocked but needs the box; the files of another account get their own warning.
const NO_ROWS = 'No row of the files matches a transaction of this account.'
const WRONG_ACCOUNT =
  'The IDs do not fit any gateway of this account: the files may belong to another account. Cancel and reprocess under the right account.'
const CONFIRM = 'Continue with batch fees only'
const REASON = 'Confirm that this batch has batch fees only.'

async function openAnalysis(importId: string) {
  const view = renderApp(`/imports/${importId}?step=analysis`, { as: 'analyst' })
  await screen.findByRole('region', { name: 'Validations' }, OPENING)
  return view
}

const decision = () => within(screen.getByRole('region', { name: 'Decision' }))
const continueButton = () => decision().getByRole('button', { name: 'Continue to settlement review' })
const header = () => within(screen.getByRole('region', { name: 'Import' }))

describe('Analysis & Validations: a batch without matched rows (spec "batch sin filas asociadas")', () => {
  it('files of another account (all id_format): both warnings, Continue waits for the box, then sends confirmEmptyBatch', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed', unmatched: 'id_format' })
    const { runId } = seedValidationRun(importId)
    const { user } = await openAnalysis(importId)

    const notice = within(decision().getByRole('region', { name: 'Batch without matched rows' }))
    expect(notice.getByText(NO_ROWS)).toBeInTheDocument()
    expect(notice.getByText(WRONG_ACCOUNT)).toBeInTheDocument()
    const box = notice.getByRole('checkbox', { name: CONFIRM })
    expect(box).not.toBeChecked()
    expect(continueButton()).toBeDisabled()
    expect(continueButton()).toHaveAccessibleDescription(REASON)

    await user.click(box)
    expect(continueButton()).toBeEnabled()
    await user.click(continueButton())

    expect(await header().findByText('validated')).toBeInTheDocument()
    expect(validationRequests('review')[0]?.body).toEqual({ runId, inclusionVersion: 0, confirmEmptyBatch: true })
  })

  it('unmatched for another reason: the box and its notice, without the wrong-account warning', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed', unmatched: 'no_match' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    const notice = within(decision().getByRole('region', { name: 'Batch without matched rows' }))
    expect(notice.getByText(NO_ROWS)).toBeInTheDocument()
    expect(notice.queryByText(WRONG_ACCOUNT)).not.toBeInTheDocument()
    expect(notice.getByRole('checkbox', { name: CONFIRM })).toBeInTheDocument()
  })

  it('batch-issues has matched rows: no box, no notice, and the body carries only the run and its version', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { runId } = seedValidationRun(importId)
    const { user } = await openAnalysis(importId)

    expect(decision().queryByRole('region', { name: 'Batch without matched rows' })).not.toBeInTheDocument()
    await user.click(continueButton())

    expect(await header().findByText('validated')).toBeInTheDocument()
    expect(validationRequests('review')[0]?.body).toEqual({ runId, inclusionVersion: 0 })
  })

  it('409 no_matched_rows says so, reads the import again and unticks the box', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed', unmatched: 'id_format' })
    seedValidationRun(importId)
    const { user } = await openAnalysis(importId)
    const box = () => decision().getByRole('checkbox', { name: CONFIRM })
    respondNext('review', {
      status: 409,
      code: 'no_matched_rows',
      details: {
        rowsTotal: 783,
        rowsUnmatched: 780,
        unmatchedByReason: { no_match: 0, id_format: 780, lossy_numeric_id: 0, no_gateways: 0 },
        likelyWrongAccount: true,
      },
    })

    await user.click(box())
    await user.click(continueButton())

    expect(
      await screen.findByText('This import has no matched rows. Confirm that the batch has batch fees only.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(box()).not.toBeChecked())
    expect(continueButton()).toBeDisabled()
    expect(header().getByText('analyzed')).toBeInTheDocument()
  })

  it('409 inclusions_changed unticks the box too: the run is the same, the confirmation is made again (#53)', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed', unmatched: 'id_format' })
    const { runId } = seedValidationRun(importId)
    const { user } = await openAnalysis(importId)
    const box = () => decision().getByRole('checkbox', { name: CONFIRM })
    respondNext('review', {
      status: 409,
      code: 'inclusions_changed',
      details: { runId, inclusionVersion: 0, currentInclusionVersion: 1 },
    })

    await user.click(box())
    await user.click(continueButton())

    expect(
      await screen.findByText('The inclusions changed since you loaded them. Check them and continue again.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(box()).not.toBeChecked())
    await waitFor(() => expect(continueButton()).toHaveAccessibleDescription(REASON))
    expect(continueButton()).toBeDisabled()
  })

  it('a new run unticks the box: nothing confirmed carries over between runs (review-diff #135, point 4)', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed', unmatched: 'id_format' })
    const { runId } = seedValidationRun(importId)
    const { user } = await openAnalysis(importId)
    const box = () => decision().getByRole('checkbox', { name: CONFIRM })
    await user.click(box())
    expect(box()).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Run again' }))
    await waitFor(() => expect(validationRequests('run')).toHaveLength(1))
    expect(await screen.findByText(new RegExp(`^Run #${runId + 1} ·`))).toBeInTheDocument()

    expect(box()).not.toBeChecked()
    // Unticked, Continue waits for the box again: no review leaves without a confirmation made on this run.
    expect(continueButton()).toBeDisabled()
    expect(continueButton()).toHaveAccessibleDescription(REASON)

    // Confirmed again on the new run, one review leaves, for the new run.
    await user.click(box())
    await user.click(continueButton())
    expect(await header().findByText('validated')).toBeInTheDocument()
    expect(validationRequests('review')).toHaveLength(1)
    expect(validationRequests('review')[0]?.body).toEqual({
      runId: runId + 1,
      inclusionVersion: 0,
      confirmEmptyBatch: true,
    })
  })
})
