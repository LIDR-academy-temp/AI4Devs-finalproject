import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import { importRecord, importRequests } from '@/test/msw/imports'
import {
  batchCleanPreview,
  failNextSettlement,
  holdNextSettlement,
  type PreviewFixture,
  respondNextSettlement,
  scriptPreview,
  seedActiveBatch,
  settlementRequests,
} from '@/test/msw/settlements'
import { seedValidationRun } from '@/test/msw/validations'
import {
  AFTER_DEBOUNCE,
  batchNoField,
  chooseDate,
  openReview,
  preSummary,
  previewShown,
  processButton,
  validatedImport,
} from '@/test/settlement-screens'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const CONFIRM = 'Assign these channels to this account as primary'
const confirmBox = () => screen.getByRole('checkbox', { name: CONFIRM })
const RAM_03 = {
  channelId: 1003,
  name: 'RAM-03',
  assignment: 'assigned_to_other_account' as const,
  otherAccount: { accountId: ACCOUNT_IDS['ProviderA-EUR'], name: 'ProviderA-EUR' },
}
const noChannels = (): PreviewFixture => ({
  ...batchCleanPreview(),
  requiresChannelConfirmation: false,
  channelsToAssign: [],
})

/** Settlement Review of batch-clean with the date chosen and its preview on screen. */
async function readyToProcess(fixture?: PreviewFixture) {
  const ids = validatedImport('batch-clean', fixture)
  const view = await openReview(ids.importId)
  chooseDate('2026-10-24')
  await previewShown()
  return { ...ids, ...view }
}

describe('Settlement Review: channels to assign (spec "canales a asociar")', () => {
  it('RAM-07 without account (HU3 CA5): listed, the box unchecked and Process waits for it', async () => {
    const { user } = await readyToProcess()

    expect(preSummary().getByText('RAM-07 · not assigned yet')).toBeInTheDocument()
    expect(confirmBox()).not.toBeChecked()
    expect(processButton()).toBeDisabled()
    expect(processButton()).toHaveAccessibleDescription(/Confirm the channel assignment\./)

    await user.click(confirmBox())

    expect(processButton()).toBeEnabled()
  })

  it('the box is unchecked again when the channels to assign change between two previews', async () => {
    const { importId } = validatedImport()
    scriptPreview(importId, [batchCleanPreview(), { ...batchCleanPreview(), channelsToAssign: [RAM_03] }])
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()
    await user.click(confirmBox())

    await user.clear(batchNoField())
    await user.type(batchNoField(), '124')
    await previewShown()

    expect(preSummary().getByText('RAM-03 · primary account: ProviderA-EUR')).toBeInTheDocument()
    expect(confirmBox()).not.toBeChecked()
  })

  it('409 channel_assignment_not_confirmed: the channels of the answer, the box unchecked and a new preview', async () => {
    const { user, importId } = await readyToProcess()
    await user.click(confirmBox())
    const previews = settlementRequests('preview').length
    // What the API would answer next: the preview now lists the channel too.
    scriptPreview(importId, [{ ...batchCleanPreview(), channelsToAssign: [RAM_03] }])
    respondNextSettlement('process', {
      status: 409,
      code: 'channel_assignment_not_confirmed',
      details: { channels: [RAM_03] },
    })

    await user.click(processButton())

    expect(await preSummary().findByText('RAM-03 · primary account: ProviderA-EUR')).toBeInTheDocument()
    expect(confirmBox()).not.toBeChecked()
    await waitFor(() => expect(settlementRequests('preview').length).toBeGreaterThan(previews))
  })

  it('without channels to assign there is no box and the body does not carry the confirmation', async () => {
    const { user } = await readyToProcess(noChannels())

    expect(screen.queryByRole('checkbox', { name: CONFIRM })).not.toBeInTheDocument()
    await user.click(processButton())

    await waitFor(() => expect(settlementRequests('process')).toHaveLength(1))
    expect(settlementRequests('process')[0]!.body).not.toHaveProperty('confirmChannelAssignment')
  })
})

describe('Settlement Review: process (spec "procesar")', () => {
  it('batch-clean (HU3 CA6): one POST with the body of the preview, and the Summary of the attempt without a GET', async () => {
    const { user, router, runId, importId } = await readyToProcess()
    await user.click(confirmBox())
    const hold = holdNextSettlement('process')

    await user.dblClick(processButton())
    await hold.arrived
    expect(settlementRequests('process')).toHaveLength(1)
    hold.release()

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/settlements\//))
    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' })).toBeInTheDocument()
    expect(settlementRequests('process')).toHaveLength(1)
    expect(settlementRequests('process')[0]!.body).toEqual({
      runId,
      batchNo: 123,
      settlementDate: '2026-10-24',
      batchFees: [
        { feeTypeId: 121, feeId: null, amount: '25.0000', description: 'Wire Fee', source: 'file' },
        { feeTypeId: 117, feeId: null, amount: '15.0000', description: 'Settlement Fee', source: 'file' },
      ],
      confirmChannelAssignment: true,
    })
    expect(settlementRequests('get')).toHaveLength(0)
    expect(importRecord(importId).status).toBe('processed')

    // The form was replaced in the history: going back does not reopen it.
    act(() => router.history.back())
    await wait(50)
    expect(router.state.location.pathname).toMatch(/^\/settlements\//)
  })

  it('two clicks in the same tick, before React re-renders, still send a single POST', async () => {
    const { user } = await readyToProcess()
    await user.click(confirmBox())
    const hold = holdNextSettlement('process')
    const button = processButton()

    // Inside one act the button cannot be disabled between the clicks: only the synchronous guard stops the second.
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    await hold.arrived
    hold.release()

    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' })).toBeInTheDocument()
    expect(settlementRequests('process')).toHaveLength(1)
  })

  it('a change while its preview is on its way: Process waits for it, and the POST carries the new amount', async () => {
    const { user } = await readyToProcess()
    await user.click(confirmBox())
    const held = holdNextSettlement('preview')
    const amount = screen.getByRole('textbox', { name: 'Amount — Wire Fee' })

    await user.clear(amount)
    await user.type(amount, '30.0000')
    await held.arrived

    expect(processButton()).toBeDisabled()
    expect(processButton()).toHaveAccessibleDescription(/Waiting for the pre-summary\./)
    held.release()
    await previewShown()
    await user.click(processButton())

    await waitFor(() => expect(settlementRequests('process')).toHaveLength(1))
    const body = settlementRequests('process')[0]!.body as { batchFees: { amount: string }[] }
    expect(body.batchFees[0]!.amount).toBe('30.0000')
  })

  it('while the POST is on its way the fields and the buttons are disabled and the screen says so', async () => {
    const { user } = await readyToProcess()
    await user.click(confirmBox())
    const hold = holdNextSettlement('process')

    await user.click(processButton())
    await hold.arrived

    expect(processButton()).toBeDisabled()
    expect(processButton()).toHaveAccessibleDescription(/Processing the batch…/)
    expect(batchNoField()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove Wire Fee' })).toBeDisabled()
    hold.release()
    await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' })
  })

  it('while the POST is on its way the channel box is disabled too', async () => {
    const { user } = await readyToProcess()
    await user.click(confirmBox())
    const hold = holdNextSettlement('process')

    await user.click(processButton())
    await hold.arrived

    expect(confirmBox()).toBeDisabled()
    hold.release()
    await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' })
  })

  it('409 import_not_validated: the import is read again and the screen shows it is not validated', async () => {
    const { user, importId } = await readyToProcess()
    await user.click(confirmBox())
    const reads = importRequests('detail').length
    importRecord(importId).status = 'analyzed'

    await user.click(processButton())

    // The screen moves to the state of an import not validated and keeps saying why.
    expect(
      await screen.findByText('The import is no longer validated (status: analyzed). Review its validations again.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the Analysis step' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Process batch/ })).not.toBeInTheDocument()
    expect(importRequests('detail').length).toBeGreaterThan(reads)
    expect(settlementRequests('process')[0]!.status).toBe(409)
  })

  it('409 validation_run_superseded: says so with a link to the Analysis step and Process is disabled', async () => {
    const { user, importId } = await readyToProcess()
    await user.click(confirmBox())
    seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })

    await user.click(processButton())

    expect(
      (await screen.findAllByText('A newer validation run exists. Review it before processing.')).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Go to the Analysis step' }).length).toBeGreaterThan(0)
    await waitFor(() => expect(processButton()).toBeDisabled())
  })

  it('a network failure: says so, keeps the form and Process is available again', async () => {
    const { user } = await readyToProcess()
    await user.click(confirmBox())
    failNextSettlement('process')

    await user.click(processButton())

    expect(await screen.findByText('The batch could not be processed. Try again.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Settlement Review' })).toBeInTheDocument()
    expect(screen.getByLabelText('Settlement date')).toHaveValue('2026-10-24')
    await waitFor(() => expect(processButton()).toBeEnabled())
  })

  it('every reason of a disabled Process is visible and linked to the button', async () => {
    const { importId } = validatedImport()
    await openReview(importId)
    await wait(AFTER_DEBOUNCE)

    const description = processButton().getAttribute('aria-describedby')!
    const reasons = within(document.getElementById(description)!)
    expect(reasons.getByText('Choose the settlement date.')).toBeVisible()
  })

  it('every reason that applies is shown at once: a number in use and the channels not confirmed', async () => {
    seedActiveBatch(ACCOUNT_IDS['ProviderA-USD'], 123)
    await readyToProcess()

    expect(processButton()).toBeDisabled()
    const description = processButton().getAttribute('aria-describedby')!
    const reasons = within(document.getElementById(description)!)
    expect(reasons.getByText('Choose a batch number that is not in use.')).toBeVisible()
    expect(reasons.getByText('Confirm the channel assignment.')).toBeVisible()
  })
})
