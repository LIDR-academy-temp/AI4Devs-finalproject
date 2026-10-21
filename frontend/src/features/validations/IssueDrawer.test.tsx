import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { auditInstant } from '@/lib/format'
import type { UserName } from '@/test/msw/fixtures'
import { issueTokens } from '@/test/msw/handlers'
import { seedImport } from '@/test/msw/imports'
import { batchIssuesFixture, issueKey, missing, occurrenceKey, seedValidationRun } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Audit instants are converted to New York time whatever the zone of the browser.
process.env.TZ = 'Asia/Tokyo'

const FILE = 'Recon_Template_ProviderB-Main_batch-issues.xlsx'

async function openFinding(importId: string, issueId: number) {
  const view = renderApp(`/imports/${importId}?step=analysis&issue=${issueId}`, { as: 'analyst' })
  await screen.findByRole('dialog', {}, OPENING)
  return view
}

const drawer = () => within(screen.getByRole('dialog'))
/** The facts of the finding as [term, definition] pairs. */
const facts = () =>
  drawer()
    .getAllByRole('term')
    .map((term) => [term.textContent, term.nextElementSibling?.textContent])
const occurrences = () => within(drawer().getByRole('region', { name: 'Occurrences' })).getAllByRole('listitem')

/** Whether an occurrence is included now, shown as text or as the state of its switch. */
function included(item: HTMLElement): boolean {
  const control = within(item).queryByRole('switch')
  if (control) return control.getAttribute('aria-checked') === 'true'
  return within(item).queryByText('Included', { exact: true }) !== null
}

/** A change made through the fake API before the screen opens, as another session would have made it. */
async function patch(as: UserName, path: string, body: object) {
  const { accessToken } = issueTokens(as)
  await fetch(`${window.location.origin}/api/v1${path}`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Analysis & Validations: detail of a finding (spec "detalle de un hallazgo")', () => {
  it('duplicate in batch (HU2 CA2): both occurrences with file, sheet, row and status, which one is included', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const duplicate = issues.find((i) => i.validationCode === 'duplicate_in_batch')!
    await openFinding(importId, duplicate.issueId)

    expect(screen.getByRole('dialog', { name: 'Duplicate in batch · 441706751475644' })).toBeInTheDocument()
    const [first, second] = occurrences()
    expect(occurrences()).toHaveLength(2)
    expect(first).toHaveTextContent(`${FILE} · APP · row 12`)
    expect(first).toHaveTextContent('Successful')
    expect(first).toHaveTextContent('Included by default')
    expect(included(first!)).toBe(true)
    expect(second).toHaveTextContent(`${FILE} · APP · row 338`)
    expect(second).toHaveTextContent('Excluded by default')
    expect(included(second!)).toBe(false)
  })

  it('an occurrence of a previous batch shows the batch, the attempt, the account and the batch status', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const across = issues.find((i) => i.validationCode === 'duplicate_across_batches')!
    await openFinding(importId, across.issueId)

    const [current, historic] = occurrences()
    expect(current).toHaveTextContent('Excluded by default')
    expect(historic).toHaveTextContent('Batch #7 · attempt 1 · ProviderB-Main')
    expect(historic).toHaveTextContent('paid')
  })

  it('an unresolved status is shown as such, and CHB 2 when the amount is excluded', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const fixture = batchIssuesFixture()
    const collision = fixture.issues.find((i) => i.validationCode === 'status_collision_in_batch')!
    collision.occurrences[1] = { ...collision.occurrences[1]!, status: null }
    collision.occurrences[0] = { ...collision.occurrences[0]!, excludeAmount: true }
    const { issues } = seedValidationRun(importId, fixture)
    await openFinding(importId, issues.find((i) => i.validationCode === 'status_collision_in_batch')!.issueId)

    const [first, second] = occurrences()
    expect(first).toHaveTextContent('CHB 2')
    expect(second).toHaveTextContent('Unresolved status')
  })

  it('shows who changed an occurrence and when, the resolution and the history, in ET', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const duplicate = issues.find((i) => i.validationCode === 'duplicate_in_batch')!
    // The fake's audit clock: the run at 14:00:01 UTC, this change at 14:00:02 UTC, 10:00 in New York.
    await patch('analyst', `/conflict-occurrences/${duplicate.occurrences[1]!.occurrenceId}`, {
      includeInSettlement: true,
    })
    await openFinding(importId, duplicate.issueId)

    expect(occurrences()[1]).toHaveTextContent('Changed by analyst · 2026-10-18 10:00 ET')
    const history = within(drawer().getByRole('region', { name: 'History' })).getAllByRole('listitem')
    expect(history.map((h) => h.textContent)).toEqual([
      `analyst · 2026-10-18 10:00 ET · ${FILE} · APP · row 338 · excluded → included`,
    ])
  })

  it('an audit instant in daylight saving time (spec "Auditoría en horario de verano") is shown in ET', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const at = auditInstant('2026-10-18T14:20:00.000Z')
    const key = occurrenceKey(issueKey('duplicate_in_batch', '441706751475644'), 1)
    const { issues } = seedValidationRun(importId, undefined, {
      patches: {
        [key]: {
          next: (d) => ({ ...d, occurrences: d.occurrences.map((o, i) => (i === 1 ? { ...o, changedAt: at } : o)) }),
        },
      },
    })
    const duplicate = issues.find((i) => i.validationCode === 'duplicate_in_batch')!
    await patch('analyst', `/conflict-occurrences/${duplicate.occurrences[1]!.occurrenceId}`, {
      includeInSettlement: true,
    })
    await openFinding(importId, duplicate.issueId)

    expect(occurrences()[1]).toHaveTextContent('Changed by analyst · 2026-10-18 10:20 ET')
  })

  it('a change of inclusion in the history without from or to still reads as a change', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const key = occurrenceKey(issueKey('duplicate_in_batch', '441706751475644'), 1)
    const { issues } = seedValidationRun(importId, undefined, {
      patches: { [key]: { next: (d) => ({ ...d, history: d.history.map((h) => ({ ...h, from: null, to: null })) }) } },
    })
    const duplicate = issues.find((i) => i.validationCode === 'duplicate_in_batch')!
    await patch('analyst', `/conflict-occurrences/${duplicate.occurrences[1]!.occurrenceId}`, {
      includeInSettlement: true,
    })
    await openFinding(importId, duplicate.issueId)

    const history = within(drawer().getByRole('region', { name: 'History' })).getAllByRole('listitem')
    expect(history.map((h) => h.textContent)).toEqual([
      `analyst · 2026-10-18 10:00 ET · ${FILE} · APP · row 338 · inclusion changed`,
    ])
  })

  it('opened from the address without its list, Escape gives the focus to the heading of the validations', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const duplicate = issues.find((i) => i.validationCode === 'duplicate_in_batch')!
    const { user } = await openFinding(importId, duplicate.issueId)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Validations' })))
  })

  it('shows a resolution by hand with its user, date and note', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const nra = issues.find((i) => i.issueType === 'non_recorded_adjustment')!
    await patch('analyst', `/validation-issues/${nra.issueId}`, {
      resolutionStatus: 'resolved',
      note: 'Checked in the gateway',
    })
    await openFinding(importId, nra.issueId)

    expect(drawer().getByText('Resolved by analyst · 2026-10-18 10:00 ET')).toBeInTheDocument()
    const history = within(drawer().getByRole('region', { name: 'History' })).getAllByRole('listitem')
    expect(history.map((h) => h.textContent)).toEqual([
      'analyst · 2026-10-18 10:00 ET · resolved: "Checked in the gateway"',
    ])
  })

  it('a one-row finding shows its row and does not say that the transaction is not in the batch', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const nra = issues.find((i) => i.issueType === 'non_recorded_adjustment')!
    await openFinding(importId, nra.issueId)

    expect(drawer().getByText(`${FILE} · CHB · row 8`)).toBeInTheDocument()
    expect(drawer().queryByText('No occurrences: the transaction is not in this batch.')).not.toBeInTheDocument()
  })

  it('a missing finding says that the transaction is not in the batch', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const missing = issues.find((i) => i.validationCode === 'missing_previous_to_batch')!
    await openFinding(importId, missing.issueId)

    expect(drawer().getByText('No occurrences: the transaction is not in this batch.')).toBeInTheDocument()
  })

  it('missing in range: the batch range of its cycle and status, from the run, and why it is missing', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const inRange = issues.find((i) => i.validationCode === 'missing_in_range' && i.missingRange === 'APP')!
    await openFinding(importId, inRange.issueId)

    expect(facts()).toContainEqual(['Batch range (E/APP)', '2026-09-28 00:00 ET – 2026-10-07 23:59 ET'])
    expect(facts().map(([term]) => term)).not.toContain('Range')
    expect(
      drawer().getByText(
        'Its date is inside the batch range, but it is not in this batch and no batch processed it in this cycle.',
      ),
    ).toBeInTheDocument()
  })

  it('missing previous to batch: the DEC range and why it is missing', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const previous = issues.find((i) => i.validationCode === 'missing_previous_to_batch')!
    await openFinding(importId, previous.issueId)

    expect(facts()).toContainEqual(['Batch range (E/DEC)', '2026-09-29 00:00 ET – 2026-10-07 23:59 ET'])
    expect(
      drawer().getByText('Its date is before the batch range and no batch processed it in this cycle.'),
    ).toBeInTheDocument()
  })

  it('cycle I names the status of the transaction, and R has no status', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const fixture = batchIssuesFixture()
    fixture.issues.push(missing('missing_previous_to_batch', 'I', '900000000000001', '2026-09-20T12:00:00.000Z'))
    const { issues } = seedValidationRun(importId, fixture)
    const chargeback = issues.find((i) => i.transactionIdRaw === '900000000000001')!
    const { unmount } = await openFinding(importId, chargeback.issueId)

    expect(facts()).toContainEqual(['Batch range (I/CHB)', '2026-09-28 00:00 ET – 2026-10-11 00:00 ET'])
    unmount()

    const reserve = issues.find((i) => i.validationCode === 'missing_in_range' && i.missingRange === 'R')!
    await openFinding(importId, reserve.issueId)
    expect(facts()).toContainEqual(['Batch range (R)', '2026-03-31 00:00 ET – 2026-04-09 00:00 ET'])
  })

  it('a missing finding of a superseded run keeps Range: the screen only has the ranges of the current run', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const old = seedValidationRun(importId).issues.find((i) => i.validationCode === 'missing_previous_to_batch')!
    seedValidationRun(importId)
    await openFinding(importId, old.issueId)

    expect(facts()).toContainEqual(['Range', 'DEC'])
    expect(facts().map(([term]) => term)).not.toContain('Batch range (E/DEC)')
    expect(
      drawer().getByText('Its date is before the batch range and no batch processed it in this cycle.'),
    ).toBeInTheDocument()
  })

  it('a finding of a superseded run says so', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const old = seedValidationRun(importId).issues.find((i) => i.validationCode === 'duplicate_in_batch')!
    seedValidationRun(importId)
    await openFinding(importId, old.issueId)

    expect(drawer().getByText('This finding belongs to a superseded run.')).toBeInTheDocument()
  })

  it('a finding that does not exist closes the drawer and leaves the address', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { router } = renderApp(`/imports/${importId}?step=analysis&issue=999999`, { as: 'analyst' })

    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('issue'), OPENING)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens from the list with Enter with the focus inside, and Escape gives the focus back to the finding', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user } = renderApp(`/imports/${importId}?step=analysis&validation=duplicate_in_batch`, { as: 'analyst' })
    const opener = await within(await screen.findByRole('table', { name: 'Findings' }, OPENING)).findByRole('button', {
      name: '441706751475644',
    })

    opener.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).toHaveTextContent(/^441706751475644$/)
    })
  })
})
