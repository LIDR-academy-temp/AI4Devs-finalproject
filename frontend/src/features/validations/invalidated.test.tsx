import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { auditInstant } from '@/lib/format'
import { seedImport } from '@/test/msw/imports'
import { seedInvalidatedReview, seedValidationRun } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

process.env.TZ = 'Asia/Tokyo'

async function openAnalysis(importId: string, search = '') {
  const view = renderApp(`/imports/${importId}?step=analysis${search}`, { as: 'analyst' })
  await screen.findByRole('region', { name: 'Validations' }, OPENING)
  return view
}

const header = () => within(screen.getByRole('region', { name: 'Import' }))
const notice = () => screen.queryByRole('region', { name: 'Review invalidated' })

// Instants of different hours and two users: swapping who reviewed and who invalidated, or their times, shows.
const RUN_AT = '2026-10-18T11:15:00.000Z' // 07:15 ET
const REVIEWED_AT = '2026-10-18T12:30:00.000Z' // 08:30 ET

describe('Analysis & Validations: invalidated review (spec "aviso de revisión invalidada")', () => {
  it('running again after the review (criterion 4 of the issue) says who reviewed, who invalidated, when and why', async () => {
    const { importId } = seedImport('batch-issues', { status: 'validated' })
    const { runId } = seedValidationRun(importId, undefined, {
      reviewedBy: 'admin',
      reviewedAt: REVIEWED_AT,
      runAt: RUN_AT,
    })
    const { user } = await openAnalysis(importId)
    expect(notice()).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Run again' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Run again' }))

    // Reviewed by admin at 08:30 in New York; invalidated by analyst at 10:00, the fake's audit clock.
    expect(
      await screen.findByText(
        `The review by admin on 2026-10-18 08:30 ET was invalidated by analyst on 2026-10-18 10:00 ET: the validations ran again (run #${runId + 1}).`,
      ),
    ).toBeInTheDocument()
    expect(await header().findByText('analyzed')).toBeInTheDocument()
  })

  it('a change of inclusion on a validated import says so', async () => {
    const { importId } = seedImport('batch-issues', { status: 'validated' })
    const { issues } = seedValidationRun(importId, undefined, {
      reviewedBy: 'admin',
      reviewedAt: REVIEWED_AT,
      runAt: RUN_AT,
    })
    const duplicate = issues.find((i) => i.validationCode === 'duplicate_in_batch')!
    const { user } = await openAnalysis(importId, `&validation=duplicate_in_batch&issue=${duplicate.issueId}`)
    const drawer = within(await screen.findByRole('dialog'))

    await user.click(drawer.getByRole('switch', { name: /row 338$/ }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Change the inclusion' }),
    )
    await waitFor(() => expect(drawer.getByRole('switch', { name: /row 338$/ })).toBeChecked())
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(await screen.findByRole('region', { name: 'Review invalidated' })).toHaveTextContent(
      'The review by admin on 2026-10-18 08:30 ET was invalidated by analyst on 2026-10-18 10:00 ET: an inclusion was changed.',
    )
  })

  it('a new review makes it disappear', async () => {
    const { importId } = seedImport('batch-issues', { status: 'validated' })
    seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
    const { user } = await openAnalysis(importId)
    await user.click(screen.getByRole('button', { name: 'Run again' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Run again' }))
    await screen.findByRole('region', { name: 'Review invalidated' })

    await user.click(await screen.findByRole('button', { name: 'Continue to settlement review' }))

    expect(await header().findByText('validated')).toBeInTheDocument()
    await waitFor(() => expect(notice()).not.toBeInTheDocument())
  })

  it('an invalidation older than the current review is not shown', async () => {
    const { importId } = seedImport('batch-issues', { status: 'validated' })
    const { runId } = seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
    seedInvalidatedReview(importId, {
      runId: runId - 1,
      reviewedBy: { userId: 2, userName: 'analyst' },
      reviewedAt: auditInstant('2026-10-18T12:00:00.000Z'),
      invalidatedBy: { userId: 1, userName: 'admin' },
      invalidatedAt: auditInstant('2026-10-18T13:00:00.000Z'),
      reason: 'rerun',
      newRunId: runId,
      occurrenceId: null,
    })
    await openAnalysis(importId)

    expect(screen.getByRole('table', { name: 'Validation results' })).toBeInTheDocument()
    expect(notice()).not.toBeInTheDocument()
  })
})
