import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { auditInstant } from '@/lib/format'
import { seedImport } from '@/test/msw/imports'
import { holdNextValidation, issueKey, seedValidationRun, validationRequests } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

process.env.TZ = 'Asia/Tokyo'

const NRA = issueKey('non_recorded_adjustment', '281520820250015')
const NOTE = 'Checked in the gateway: adjustment recorded late'

async function openFinding(importId: string, issueId: number) {
  const view = renderApp(`/imports/${importId}?step=analysis&issue=${issueId}`, { as: 'analyst' })
  await screen.findByRole('dialog', {}, OPENING)
  return view
}

const drawer = () => within(screen.getByRole('dialog'))
const nraOf = (issues: ReturnType<typeof seedValidationRun>['issues']) =>
  issues.find((i) => i.issueType === 'non_recorded_adjustment')!

describe('Analysis & Validations: resolving by hand with a note (spec "resolver a mano con nota")', () => {
  it('sends the trimmed note and shows Resolved with my user, the date in ET and the note, also in the history', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    // The scenario scripts the answer at 2 Nov 2026, 15:00 UTC: 10:00 in New York, standard time (EST).
    const at = auditInstant('2026-11-02T15:00:00.000Z')
    const nra = nraOf(
      seedValidationRun(importId, undefined, {
        patches: {
          [NRA]: { next: (d) => ({ ...d, resolvedAt: at, history: d.history.map((h) => ({ ...h, at })) }) },
        },
      }).issues,
    )
    const { user } = await openFinding(importId, nra.issueId)

    await user.type(drawer().getByLabelText('Note'), `  ${NOTE}  `)
    await user.click(drawer().getByRole('button', { name: 'Mark as resolved' }))

    expect(await drawer().findByText('Resolved by analyst · 2026-11-02 10:00 ET')).toBeInTheDocument()
    expect(validationRequests('resolve')[0]).toMatchObject({
      method: 'PATCH',
      url: `/api/v1/validation-issues/${nra.issueId}`,
      body: { resolutionStatus: 'resolved', note: NOTE },
    })
    expect(drawer().getByText(NOTE)).toBeInTheDocument()
    const history = within(drawer().getByRole('region', { name: 'History' })).getAllByRole('listitem')
    expect(history.map((h) => h.textContent)).toEqual([`analyst · 2026-11-02 10:00 ET · resolved: "${NOTE}"`])
    expect(drawer().queryByRole('button', { name: 'Mark as resolved' })).not.toBeInTheDocument()
  })

  it('an empty note, or only spaces, says so and does not call the API', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const nra = nraOf(seedValidationRun(importId).issues)
    const { user } = await openFinding(importId, nra.issueId)

    await user.click(drawer().getByRole('button', { name: 'Mark as resolved' }))
    expect(await drawer().findByText('Write a note before resolving.')).toBeInTheDocument()
    await user.type(drawer().getByLabelText('Note'), '    ')
    await user.click(drawer().getByRole('button', { name: 'Mark as resolved' }))
    expect(await drawer().findByText('Write a note before resolving.')).toBeInTheDocument()

    expect(validationRequests('resolve')).toHaveLength(0)
  })

  it('a note of more than 500 characters says so and does not call the API', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const nra = nraOf(seedValidationRun(importId).issues)
    const { user } = await openFinding(importId, nra.issueId)

    await user.click(drawer().getByLabelText('Note'))
    await user.paste('x'.repeat(501))
    await user.click(drawer().getByRole('button', { name: 'Mark as resolved' }))

    expect(await drawer().findByText('The note can have at most 500 characters.')).toBeInTheDocument()
    expect(validationRequests('resolve')).toHaveLength(0)
  })

  it('409 issue_already_resolved names who resolved it and when, and reads the finding again', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const nra = nraOf(
      seedValidationRun(importId, undefined, {
        patches: {
          [NRA]: {
            error: {
              status: 409,
              code: 'issue_already_resolved',
              details: { resolvedAt: '2026-11-02T15:00:00.000Z', resolvedBy: { userId: 1, userName: 'admin' } },
            },
          },
        },
      }).issues,
    )
    const { user } = await openFinding(importId, nra.issueId)
    const gets = validationRequests('issue').length

    await user.type(drawer().getByLabelText('Note'), NOTE)
    await user.click(drawer().getByRole('button', { name: 'Mark as resolved' }))

    expect(
      await drawer().findByText('This finding was already resolved by admin on 2026-11-02 10:00 ET.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(validationRequests('issue').length).toBeGreaterThan(gets))
  })

  it('a duplicate is not resolved by hand: no Mark as resolved', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const duplicate = seedValidationRun(importId).issues.find((i) => i.validationCode === 'duplicate_in_batch')!
    await openFinding(importId, duplicate.issueId)

    expect(drawer().queryByRole('button', { name: 'Mark as resolved' })).not.toBeInTheDocument()
    expect(drawer().queryByLabelText('Note')).not.toBeInTheDocument()
  })

  it('two clicks on Mark as resolved in the same tick send a single PATCH', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const nra = nraOf(seedValidationRun(importId).issues)
    const hold = holdNextValidation('resolve')
    const { user } = await openFinding(importId, nra.issueId)
    await user.type(drawer().getByLabelText('Note'), NOTE)
    const button = drawer().getByRole('button', { name: 'Mark as resolved' })

    // Inside one act the button cannot be disabled between the clicks: only the synchronous guard stops the second.
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    await hold.arrived
    hold.release()

    expect(await drawer().findByText(/^Resolved by analyst · /)).toBeInTheDocument()
    expect(validationRequests('resolve')).toHaveLength(1)
  })
})
