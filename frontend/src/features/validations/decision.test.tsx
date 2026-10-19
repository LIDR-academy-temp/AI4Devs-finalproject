import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { importRequests, seedImport } from '@/test/msw/imports'
import { holdNextValidation, respondNext, seedValidationRun, validationRequests } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

process.env.TZ = 'Asia/Tokyo'

const BLOCKED = 'provider_mismatch: cancel the import and process it under the correct provider.'

async function openAnalysis(importId: string) {
  const view = renderApp(`/imports/${importId}?step=analysis`, { as: 'analyst' })
  await screen.findByRole('region', { name: 'Validations' }, OPENING)
  return view
}

const decision = () => within(screen.getByRole('region', { name: 'Decision' }))
const continueButton = () => decision().getByRole('button', { name: 'Continue to settlement review' })
const header = () => within(screen.getByRole('region', { name: 'Import' }))

describe('Analysis & Validations: continue or cancel (spec "continuar o cancelar")', () => {
  it('batch-blocked (criterion 1 of the issue, HU2 CA5): Continue is disabled with the reason and a link to the finding', async () => {
    const { importId } = seedImport('batch-blocked', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user, router } = await openAnalysis(importId)

    expect(continueButton()).toBeDisabled()
    expect(continueButton()).toHaveAccessibleDescription(BLOCKED)
    expect(decision().getByRole('button', { name: 'Cancel and reprocess' })).toBeEnabled()

    await user.click(decision().getByRole('button', { name: 'View the blocking finding' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ validation: 'provider_mismatch' }))
    const findings = within(await screen.findByRole('table', { name: 'Findings' }))
    expect(await findings.findByRole('button', { name: '252570479111759' })).toBeInTheDocument()
  })

  it('without a run Continue is disabled with Run the validations before continuing.', async () => {
    await openAnalysis(seedImport('batch-issues', { status: 'analyzed' }).importId)

    expect(continueButton()).toBeDisabled()
    expect(continueButton()).toHaveAccessibleDescription('Run the validations before continuing.')
  })

  it('warnings only (criterion 3 of the issue, HU2 CA6): reviews the run shown and offers Settlement Review', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { runId } = seedValidationRun(importId)
    const { user } = await openAnalysis(importId)

    await user.click(continueButton())

    expect(await header().findByText('validated')).toBeInTheDocument()
    expect(validationRequests('review')[0]).toMatchObject({
      method: 'POST',
      url: `/api/v1/imports/${importId}/review`,
      body: { runId },
    })
    // The fake's audit clock: the run at 14:00:01 UTC, the review at 14:00:02 UTC, 10:00 in New York.
    expect(decision().getByText('Reviewed by analyst · 2026-10-18 10:00 ET')).toBeInTheDocument()
    const next = decision().getByRole('button', { name: 'Settlement Review' })
    expect(next).toBeDisabled()
    expect(next).toHaveAccessibleDescription('Settlement Review is not available yet.')
    expect(screen.queryByRole('link', { name: /settlement review/i })).not.toBeInTheDocument()
    expect(decision().queryByRole('button', { name: 'Continue to settlement review' })).not.toBeInTheDocument()
  })

  it('409 validation_run_superseded says so, reads the run again and the next click reviews the new one', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user } = await openAnalysis(importId)
    const newer = seedValidationRun(importId)
    const gets = validationRequests('get').length

    await user.click(continueButton())

    expect(await screen.findByText('A newer validation run exists. Review it before continuing.')).toBeInTheDocument()
    await waitFor(() => expect(validationRequests('get').length).toBeGreaterThan(gets))
    await waitFor(() => expect(screen.getByText(new RegExp(`^Run #${newer.runId} `))).toBeInTheDocument())
    await user.click(continueButton())
    await waitFor(() => expect(validationRequests('review')).toHaveLength(2))
    expect(validationRequests('review')[1]!.body).toEqual({ runId: newer.runId })
  })

  it('409 blocking_validation_issue says so and reads the run again', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { runId } = seedValidationRun(importId)
    const { user } = await openAnalysis(importId)
    const gets = validationRequests('get').length
    respondNext('review', {
      status: 409,
      code: 'blocking_validation_issue',
      details: { runId, validationCodes: ['provider_mismatch'], issueIds: [1] },
    })

    await user.click(continueButton())

    expect(
      await screen.findByText('The validations found a blocking finding. The results were reloaded.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(validationRequests('get').length).toBeGreaterThan(gets))
  })

  it('a double click on Continue sends one POST review and the button stays disabled until the answer', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const hold = holdNextValidation('review')
    const { user } = await openAnalysis(importId)
    const button = continueButton()

    await user.dblClick(button)
    await hold.arrived

    expect(validationRequests('review')).toHaveLength(1)
    expect(button).toBeDisabled()
    hold.release()
    expect(await header().findByText('validated')).toBeInTheDocument()
    expect(validationRequests('review')).toHaveLength(1)
  })

  it('two clicks on Continue in the same tick, before React re-renders, still send a single POST review', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const hold = holdNextValidation('review')
    await openAnalysis(importId)
    const button = continueButton()

    // Inside one act the button cannot be disabled between the clicks: only the synchronous guard stops the second.
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    await hold.arrived
    hold.release()

    expect(await header().findByText('validated')).toBeInTheDocument()
    expect(validationRequests('review')).toHaveLength(1)
  })

  it('Continue waits while a run is on its way', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const hold = holdNextValidation('run')
    const { user } = await openAnalysis(importId)
    expect(continueButton()).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Run again' }))
    await hold.arrived

    expect(continueButton()).toBeDisabled()
    hold.release()
    await waitFor(() => expect(continueButton()).toBeEnabled())
  })

  it('a cancelled import: the decision says so in read only, without an empty section', async () => {
    const { importId } = seedImport('batch-issues', { status: 'cancelled' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    expect(
      decision().getByText('This import is cancelled. Its run and findings are kept for reference.'),
    ).toBeInTheDocument()
    expect(decision().queryAllByRole('button')).toHaveLength(0)
  })

  it('a processed import: the decision says it is processed, not cancelled', async () => {
    const { importId } = seedImport('batch-issues', { status: 'processed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    expect(
      decision().getByText('This import is processed. Its run and findings are kept for reference.'),
    ).toBeInTheDocument()
    expect(decision().queryByText(/cancelled/)).not.toBeInTheDocument()
    expect(decision().queryAllByRole('button')).toHaveLength(0)
  })

  it('Cancel and reprocess (HU2 CA8): after confirming, the run, its table and findings stay in read only', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user } = await openAnalysis(importId)

    await user.click(decision().getByRole('button', { name: 'Cancel and reprocess' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, cancel the import' }),
    )

    expect(await header().findByText('cancelled')).toBeInTheDocument()
    expect(importRequests('cancel')).toHaveLength(1)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Run again' })).not.toBeInTheDocument())
    expect(screen.getByRole('table', { name: 'Validation results' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue to settlement review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel and reprocess' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Duplicate in batch' }))
    expect(await screen.findByRole('table', { name: 'Findings' })).toBeInTheDocument()
  })
})
