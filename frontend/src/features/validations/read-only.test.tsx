import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { UserName } from '@/test/msw/fixtures'
import { importRequests, seedImport } from '@/test/msw/imports'
import { batchIssuesFixture, type RunFixture, seedValidationRun, validationRequests } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

/** What #9 answers to someone who cannot change anything: every control flag off (D9 of #9). */
function withoutControls(fixture: RunFixture, { resolvable = false } = {}): RunFixture {
  return {
    ...fixture,
    issues: fixture.issues.map((issue) => ({
      ...issue,
      resolvable: resolvable && issue.resolvable,
      occurrences: issue.occurrences.map((o) => ({ ...o, editable: false, includable: false })),
    })),
  }
}

async function openAnalysis(importId: string, as: UserName, search = '') {
  const view = renderApp(`/imports/${importId}?step=analysis${search}`, { as })
  await screen.findByRole('region', { name: 'Validations' }, OPENING)
  return view
}

const ACTIONS = [
  'Run validations',
  'Run again',
  'Continue to settlement review',
  'Cancel and reprocess',
  'Cancel import',
]

function expectNoActions() {
  for (const name of ACTIONS) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
}

describe('Analysis & Validations: read only (spec "solo lectura")', () => {
  it('viewer sees the run, the validations, the findings and their occurrences, without any action', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId, withoutControls(batchIssuesFixture()))
    const duplicate = issues.find((i) => i.validationCode === 'duplicate_in_batch')!
    const nra = issues.find((i) => i.issueType === 'non_recorded_adjustment')!
    const { user } = await openAnalysis(importId, 'viewer')

    expect(within(screen.getByRole('table', { name: 'Validation results' })).getAllByRole('row')).toHaveLength(9)
    expectNoActions()

    await user.click(screen.getByRole('button', { name: 'Duplicate in batch' }))
    await user.click(
      await within(await screen.findByRole('table', { name: 'Findings' })).findByRole('button', {
        name: '441706751475644',
      }),
    )
    const drawer = within(await screen.findByRole('dialog', { name: /441706751475644/ }))
    expect(drawer.queryByRole('switch')).not.toBeInTheDocument()
    expect(drawer.getByText('Included', { exact: true })).toBeInTheDocument()
    expect(drawer.getByText('Excluded', { exact: true })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    renderApp(`/imports/${importId}?step=analysis&issue=${nra.issueId}`, { as: 'viewer' })
    const nraDrawer = within(await screen.findByRole('dialog', { name: /281520820250015/ }, OPENING))
    expect(nraDrawer.queryByRole('button', { name: 'Mark as resolved' })).not.toBeInTheDocument()
    expect(duplicate.issueId).not.toBe(nra.issueId)

    expect(validationRequests().filter((r) => r.method !== 'GET')).toHaveLength(0)
    expect(importRequests('cancel')).toHaveLength(0)
  })

  it('a cancelled import with an adjustment still resolvable: no Run nor Continue, no switches, Mark as resolved offered', async () => {
    const { importId } = seedImport('batch-issues', { status: 'cancelled' })
    const { issues } = seedValidationRun(importId, withoutControls(batchIssuesFixture(), { resolvable: true }))
    const nra = issues.find((i) => i.issueType === 'non_recorded_adjustment')!
    await openAnalysis(importId, 'analyst', `&issue=${nra.issueId}`)

    const drawer = within(await screen.findByRole('dialog', { name: /281520820250015/ }, OPENING))
    expect(drawer.queryByRole('switch')).not.toBeInTheDocument()
    expect(drawer.getByRole('button', { name: 'Mark as resolved' })).toBeInTheDocument()
    await screen.findByRole('dialog')
    expect(screen.queryByRole('button', { name: 'Run again', hidden: true })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Continue to settlement review', hidden: true }),
    ).not.toBeInTheDocument()
  })

  it('viewer on an analyzed import: no empty section for the decision', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId, withoutControls(batchIssuesFixture()))
    await openAnalysis(importId, 'viewer')

    expect(screen.getByRole('table', { name: 'Validation results' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Decision' })).not.toBeInTheDocument()
  })

  it('a processed import: no Run nor Continue', async () => {
    const { importId } = seedImport('batch-issues', { status: 'processed' })
    seedValidationRun(importId, withoutControls(batchIssuesFixture()))
    await openAnalysis(importId, 'analyst')

    expect(screen.getByRole('table', { name: 'Validation results' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Run again' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue to settlement review' })).not.toBeInTheDocument()
  })
})
