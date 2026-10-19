import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import {
  holdNextValidation,
  issueKey,
  occurrenceKey,
  reserveVariant,
  seedValidationRun,
  validationRequests,
} from '@/test/msw/validations'
import { renderApp } from '@/test/render'

process.env.TZ = 'Asia/Tokyo'

const FILE = 'Recon_Template_ProviderB-Main_batch-issues.xlsx'
const SECOND = `${FILE} · APP · row 233`

async function openFinding(importId: string, issueId: number, validation = 'duplicate_in_batch') {
  const view = renderApp(`/imports/${importId}?step=analysis&validation=${validation}&issue=${issueId}`, {
    as: 'analyst',
  })
  await screen.findByRole('dialog')
  return view
}

const drawer = () => within(screen.getByRole('dialog'))
const occurrence = (where: string) => within(drawer().getByRole('listitem', { name: where }))
const switchOf = (where: string) => drawer().getByRole('switch', { name: `Included in settlement — ${where}` })
const header = () => within(screen.getByRole('region', { name: 'Import' }))

function duplicateOf(issues: ReturnType<typeof seedValidationRun>['issues']) {
  return issues.find((i) => i.validationCode === 'duplicate_in_batch' && i.transactionIdRaw === '441706751475644')!
}

describe('Analysis & Validations: changing the inclusion (spec "cambiar la inclusión de una aparición")', () => {
  it('including the duplicate (criterion 2 of the issue) saves it and shows my user, the date and the history', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const duplicate = duplicateOf(seedValidationRun(importId).issues)
    const { user } = await openFinding(importId, duplicate.issueId)

    expect(switchOf(SECOND)).not.toBeChecked()
    await user.click(switchOf(SECOND))

    await waitFor(() => expect(switchOf(SECOND)).toBeChecked())
    const [request] = validationRequests('inclusion')
    expect(request).toMatchObject({
      method: 'PATCH',
      url: `/api/v1/conflict-occurrences/${duplicate.occurrences[1]!.occurrenceId}`,
      body: { includeInSettlement: true },
    })
    // The fake's audit clock: the run at 14:00:01 UTC, the change at 14:00:02 UTC, 10:00 in New York.
    expect(occurrence(SECOND).getByText('Changed by analyst · 2026-10-18 10:00 ET')).toBeInTheDocument()
    const history = within(drawer().getByRole('region', { name: 'History' })).getAllByRole('listitem')
    expect(history.map((h) => h.textContent)).toEqual([
      `analyst · 2026-10-18 10:00 ET · ${SECOND} · excluded → included`,
    ])

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const findings = within(await screen.findByRole('table', { name: 'Findings' }))
    expect(await findings.findByText('2 / 2')).toBeInTheDocument()
  })

  it('a reserve that cannot be included: its switch is disabled with the reason, linked to it', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId, reserveVariant())
    const reserve = issues.find(
      (i) => i.validationCode === 'duplicate_in_batch' && i.transactionIdRaw === '357030499063804',
    )!
    await openFinding(importId, reserve.issueId)

    const blocked = switchOf(`${FILE} · RR · row 11`)
    expect(blocked).toBeDisabled()
    expect(blocked).toHaveAccessibleDescription(
      'This reserve cannot be included: another occurrence is included or it was released in a previous batch.',
    )
    // The included one can still be excluded.
    expect(switchOf(`${FILE} · RR · row 10`)).toBeEnabled()
  })

  it('409 occurrence_not_includable shows the reason of the API and the value of the server', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const key = issueKey('duplicate_in_batch', '441706751475644')
    const duplicate = duplicateOf(
      seedValidationRun(importId, undefined, {
        patches: {
          [occurrenceKey(key, 1)]: {
            error: { status: 409, code: 'occurrence_not_includable', details: { reason: 'reserve_already_included' } },
          },
        },
      }).issues,
    )
    const { user } = await openFinding(importId, duplicate.issueId)
    const gets = validationRequests('issue').length

    await user.click(switchOf(SECOND))

    expect(
      await drawer().findByText('A reserve is released only once: exclude the included occurrence first.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(validationRequests('issue').length).toBeGreaterThan(gets))
    expect(switchOf(SECOND)).not.toBeChecked()
  })

  it('an occurrence of a previous batch shows its inclusion as text, without a switch', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const across = seedValidationRun(importId).issues.find((i) => i.validationCode === 'duplicate_across_batches')!
    await openFinding(importId, across.issueId, 'duplicate_across_batches')

    const historic = occurrence('Batch #7 · attempt 1 · ProviderB-Main')
    expect(historic.queryByRole('switch')).not.toBeInTheDocument()
    expect(historic.getByText('Included', { exact: true })).toBeInTheDocument()
  })

  it('409 validation_run_superseded says so and reads the current run again', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const duplicate = duplicateOf(seedValidationRun(importId).issues)
    const { user } = await openFinding(importId, duplicate.issueId)
    const runs = validationRequests('get').length
    seedValidationRun(importId)

    await user.click(switchOf(SECOND))

    expect(await drawer().findByText('A newer validation run exists. The results were reloaded.')).toBeInTheDocument()
    await waitFor(() => expect(validationRequests('get').length).toBeGreaterThan(runs))
  })

  it('every switch of the finding waits while a change is on its way', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const duplicate = duplicateOf(seedValidationRun(importId).issues)
    const hold = holdNextValidation('inclusion')
    const { user } = await openFinding(importId, duplicate.issueId)

    await user.click(switchOf(SECOND))
    await hold.arrived

    for (const control of drawer().getAllByRole('switch')) expect(control).toBeDisabled()
    hold.release()
    await waitFor(() => expect(switchOf(SECOND)).toBeEnabled())
  })
})

describe('Analysis & Validations: inclusion on a validated import (spec "inclusión sobre un import validado")', () => {
  it('asks first; after confirming the import is analyzed again', async () => {
    const { importId } = seedImport('batch-issues', { status: 'validated' })
    const duplicate = duplicateOf(seedValidationRun(importId, undefined, { reviewedBy: 'analyst' }).issues)
    const { user } = await openFinding(importId, duplicate.issueId)

    await user.click(switchOf(SECOND))
    const dialog = within(await screen.findByRole('alertdialog'))
    expect(
      dialog.getByText('Changing an inclusion invalidates the review: the import returns to analyzed.'),
    ).toBeInTheDocument()
    expect(validationRequests('inclusion')).toHaveLength(0)

    await user.click(dialog.getByRole('button', { name: 'Change the inclusion' }))

    await waitFor(() => expect(validationRequests('inclusion')).toHaveLength(1))
    await waitFor(() => expect(switchOf(SECOND)).toBeChecked())
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await header().findByText('analyzed')).toBeInTheDocument()
  })

  it('closing the question does not call the API and keeps the switch as it was', async () => {
    const { importId } = seedImport('batch-issues', { status: 'validated' })
    const duplicate = duplicateOf(seedValidationRun(importId, undefined, { reviewedBy: 'analyst' }).issues)
    const { user } = await openFinding(importId, duplicate.issueId)

    await user.click(switchOf(SECOND))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Keep the review' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    expect(validationRequests('inclusion')).toHaveLength(0)
    expect(switchOf(SECOND)).not.toBeChecked()
  })
})
