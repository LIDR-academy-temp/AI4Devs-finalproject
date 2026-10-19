import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import { batchCleanPreview, seedActiveBatch, seedNextBatchNumber, settlementRequests } from '@/test/msw/settlements'
import {
  AFTER_DEBOUNCE,
  batchNoField,
  chooseDate,
  openReview,
  previewBodies,
  previewShown,
  processButton,
  validatedImport,
} from '@/test/settlement-screens'

const USD = ACCOUNT_IDS['ProviderA-USD']
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** batch-clean without channels to confirm, so that Process depends only on what each test looks at. */
const noChannels = () => ({ ...batchCleanPreview(), requiresChannelConfirmation: false, channelsToAssign: [] })

describe('Settlement Review: proposed and editable batch number (spec "número de batch propuesto y editable")', () => {
  it('batch-clean (HU3 CA1): the field comes with 123 and says it is the proposal, attempt 1', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)

    expect(batchNoField()).toHaveValue('123')
    expect(screen.getByText('Proposed: 123 · attempt 1')).toBeInTheDocument()
    await user.clear(batchNoField())
    await user.type(batchNoField(), '130')
    expect(batchNoField()).toHaveValue('130')
  })

  it('a reprocess after an undone attempt: the same number, attempt 2, and why', async () => {
    seedNextBatchNumber({ accountId: USD, batchNo: 118, attemptNo: 2, reason: 'reprocess' })
    const { importId } = validatedImport()
    await openReview(importId)

    expect(batchNoField()).toHaveValue('118')
    expect(
      screen.getByText('Proposed: 118 · attempt 2 (the previous attempt of this import was undone)'),
    ).toBeInTheDocument()
  })

  it('a number that is not a positive whole number: the error in the field and no preview with it', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()

    await user.clear(batchNoField())
    await user.type(batchNoField(), '0')

    expect(screen.getByText('Enter a positive whole number.')).toBeInTheDocument()
    await wait(AFTER_DEBOUNCE)
    expect(previewBodies().every((body) => (body as { batchNo: number }).batchNo === 123)).toBe(true)
  })
})

describe('Settlement Review: batch number in use (spec "número de batch en uso")', () => {
  it('the preview says it is not available: the error in the field and the reason of Process', async () => {
    seedActiveBatch(USD, 117)
    const { importId } = validatedImport('batch-clean', noChannels())
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await user.clear(batchNoField())
    await user.type(batchNoField(), '117')

    expect(
      await screen.findByText('Batch 117 already has an active attempt for this account.', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(processButton()).toBeDisabled()
    expect(processButton()).toHaveAccessibleDescription(/Choose a batch number that is not in use\./)
  })

  it('taken when processing (criterion 1 of the issue): the 409 in the field, the form kept and a new preview', async () => {
    const { importId } = validatedImport('batch-clean', noChannels())
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()
    await waitFor(() => expect(processButton()).toBeEnabled())
    const previews = settlementRequests('preview').length
    seedActiveBatch(USD, 123)

    await user.click(processButton())

    expect(
      await screen.findByText('Batch 123 already has an active attempt for this account.', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(settlementRequests('process')[0]!.status).toBe(409)
    expect(screen.getByRole('heading', { name: 'Settlement Review' })).toBeInTheDocument()
    expect(batchNoField()).toHaveValue('123')
    expect(screen.getByLabelText('Settlement date')).toHaveValue('2026-10-24')
    await waitFor(() => expect(settlementRequests('preview').length).toBeGreaterThan(previews))
    await waitFor(() => expect(processButton()).toBeDisabled())
  })
})
