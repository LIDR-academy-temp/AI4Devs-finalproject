// What the contract of #11 brought with its merge (web-settlement task 9.13): accounts of another merchant named only
// as such, an attempt without a validation summary and the 409 settlement_busy of Process.
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { batchCleanPreview, respondNextSettlement, seedSettlement, settlementRequests } from '@/test/msw/settlements'
import { renderApp } from '@/test/render'
import {
  chooseDate,
  openReview,
  preSummary,
  previewShown,
  processButton,
  validatedImport,
} from '@/test/settlement-screens'
import { OPENING } from '@/test/validation-screens'

const HIDDEN = { accountId: null, name: null, outOfScope: true as const }

/** An attempt of batch-clean stored as processed by analyst, with some fields of its view replaced, and its Summary. */
async function openSummary(overrides: Parameters<typeof seedSettlement>[1]['overrides']) {
  const { importId } = validatedImport()
  const view = seedSettlement(importId, { batchNo: 123, overrides })
  renderApp(`/settlements/${view.batchId}`, { as: 'analyst' })
  await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' }, OPENING)
  return { importId, view }
}

describe('Settlement Review: the contract of #11 after its merge', () => {
  it('a channel whose primary account is of another merchant names it only as such', async () => {
    const { importId } = validatedImport('batch-clean', {
      ...batchCleanPreview(),
      channelsToAssign: [
        { channelId: 1008, name: 'RAM-08', assignment: 'assigned_to_other_account', otherAccount: HIDDEN },
      ],
    })
    await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()

    expect(preSummary().getByText('RAM-08 · primary account: an account of another merchant')).toBeInTheDocument()
  })

  it('409 settlement_busy: says so with Retry, keeps the form, and Retry sends the same body once more', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()
    await user.click(screen.getByRole('checkbox', { name: 'Assign these channels to this account as primary' }))
    const previews = settlementRequests('preview').length
    respondNextSettlement('process', { status: 409, code: 'settlement_busy' })

    await user.click(processButton())

    expect(
      await screen.findByText('Another settlement is being processed for this provider. Try again.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Settlement Review' })).toBeInTheDocument()
    expect(screen.getByLabelText('Settlement date')).toHaveValue('2026-10-24')
    expect(settlementRequests('preview')).toHaveLength(previews)

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' })).toBeInTheDocument()
    const [first, second] = settlementRequests('process')
    expect(settlementRequests('process')).toHaveLength(2)
    expect(second!.body).toEqual(first!.body)
  })
})

describe('Settlement Summary: the contract of #11 after its merge', () => {
  it('a channel moved from an account of another merchant names it only as such', async () => {
    await openSummary({
      channelsAssigned: [
        { channelId: 1003, name: 'RAM-03', assignment: 'primary_moved_from', previousAccount: HIDDEN },
      ],
    })

    expect(
      screen.getByText('RAM-03 · primary account moved here from an account of another merchant'),
    ).toBeInTheDocument()
  })

  it('an attempt without a validation summary says so and keeps the link to the validations', async () => {
    await openSummary({ validationSummary: null })

    expect(screen.getByText('The validation summary of this attempt is not available.')).toBeInTheDocument()
    expect(screen.queryByText(/persistent ·/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View the validations' })).toBeInTheDocument()
  })
})
