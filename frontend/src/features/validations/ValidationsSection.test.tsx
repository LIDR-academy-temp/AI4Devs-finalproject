import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import { batchBlockedFixture, batchIssuesFixture, seedValidationRun, validationRequests } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Business dates must not move whatever the zone of the browser (spec "fechas en hora de Nueva York").
process.env.TZ = 'Asia/Tokyo'

async function openAnalysis(importId: string) {
  const view = renderApp(`/imports/${importId}?step=analysis`, { as: 'analyst' })
  await screen.findByRole('region', { name: 'Validations' }, OPENING)
  return view
}

const section = () => within(screen.getByRole('region', { name: 'Validations' }))
const runHeader = () => within(screen.getByRole('region', { name: 'Validation run' }))
const resultRows = () =>
  within(screen.getByRole('table', { name: 'Validation results' }))
    .getAllByRole('row')
    .slice(1)

describe('Analysis & Validations: running the validations (spec "ejecutar la corrida")', () => {
  it('without a run invites to run them and does not run them on its own', async () => {
    await openAnalysis(seedImport('batch-issues', { status: 'analyzed' }).importId)

    expect(section().getByText('No validation run yet.')).toBeInTheDocument()
    expect(section().getByRole('button', { name: 'Run validations' })).toBeEnabled()
    expect(validationRequests('run')).toHaveLength(0)
  })

  it('runs once and shows the eight validations of the run, then offers Run again', async () => {
    const { user } = await openAnalysis(seedImport('batch-issues', { status: 'analyzed' }).importId)

    await user.click(section().getByRole('button', { name: 'Run validations' }))

    expect(await screen.findByRole('table', { name: 'Validation results' })).toBeInTheDocument()
    expect(validationRequests('run')).toHaveLength(1)
    expect(resultRows()).toHaveLength(8)
    expect(section().getByRole('button', { name: 'Run again' })).toBeInTheDocument()
  })
})

describe('Analysis & Validations: header of the run (spec "cabecera de la corrida")', () => {
  it('batch-issues: Warnings, the run with its date in ET and its user, the ranges as they arrive and the counters', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { runId } = seedValidationRun(importId)
    await openAnalysis(importId)

    expect(runHeader().getByText('Warnings')).toBeInTheDocument()
    // The fake's audit clock starts at 14:00 UTC, 10:00 in New York (EDT).
    expect(runHeader().getByText(`Run #${runId} · 2026-10-18 10:00 ET · analyst`)).toBeInTheDocument()
    const ranges = within(runHeader().getByRole('list', { name: 'Ranges used' }))
    expect(ranges.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'APP 2026-09-28 00:00 ET – 2026-10-07 23:59 ET',
      'DEC 2026-09-29 00:00 ET – 2026-10-07 23:59 ET',
      'I 2026-09-28 00:00 ET – 2026-10-11 00:00 ET',
      'R 2026-03-31 00:00 ET – 2026-04-09 00:00 ET',
    ])
    const counters = within(runHeader().getByRole('list', { name: 'Informative counters' }))
    expect(counters.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Pending in range 0',
      'Undated adjustments 1',
      'Undated candidates 0',
    ])
  })

  it('batch-blocked: Blocked, and a range without rows as —', async () => {
    const { importId } = seedImport('batch-blocked', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    expect(runHeader().getByText('Blocked')).toBeInTheDocument()
    const ranges = within(runHeader().getByRole('list', { name: 'Ranges used' }))
    expect(ranges.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'APP 2026-09-28 00:00 ET – 2026-10-07 23:59 ET',
      'DEC —',
      'I —',
      'R —',
    ])
  })

  it('a run without warnings is Passed', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    expect(runHeader().getByText('Passed')).toBeInTheDocument()
  })
})

describe('Analysis & Validations: the eight validations (spec "tabla de las ocho validaciones")', () => {
  it('batch-issues: in the order of the API, with outcome, findings and breakdown', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    const cells = resultRows().map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    )
    expect(cells).toEqual([
      ['Provider mismatch', 'Passed', '0', '—', ''],
      ['Non-recorded adjustment', 'Warning', '3', '—', '1 non-recorded adjustment · 2 status mismatches'],
      ['Duplicate in batch', 'Warning', '1', '—', ''],
      ['Status collision in batch', 'Warning', '1', '—', ''],
      ['Duplicate across batches', 'Warning', '1', '—', ''],
      ['Status collision across batches', 'Warning', '1', '—', ''],
      ['Missing previous to batch', 'Warning', '10', '—', 'DEC 10'],
      ['Missing in range', 'Warning', '6', '—', 'APP 3 · R 3'],
    ])
    // A validation with findings opens its list from the keyboard: it is a button.
    expect(within(resultRows()[2]!).getByRole('button', { name: 'Duplicate in batch' })).toBeInTheDocument()
    expect(within(resultRows()[0]!).queryByRole('button')).not.toBeInTheDocument()
  })

  it('batch-blocked: Provider mismatch is Blocked, 1, Blocks', async () => {
    const { importId } = seedImport('batch-blocked', { status: 'analyzed' })
    seedValidationRun(importId, batchBlockedFixture())
    await openAnalysis(importId)

    const first = within(resultRows()[0]!)
      .getAllByRole('cell')
      .map((c) => c.textContent)
    expect(first.slice(0, 4)).toEqual(['Provider mismatch', 'Blocked', '1', 'Blocks'])
  })

  it('not_applicable is n/a, without access to findings and not shown as approved', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const fixture = batchIssuesFixture()
    fixture.results[4] = { ...fixture.results[4]!, outcome: 'not_applicable', issueCount: 0, approved: false }
    seedValidationRun(importId, fixture)
    await openAnalysis(importId)

    const row = within(resultRows()[4]!)
    expect(row.getAllByRole('cell')[1]).toHaveTextContent(/^n\/a$/)
    expect(row.queryByRole('button')).not.toBeInTheDocument()
    expect(row.queryByText('Passed')).not.toBeInTheDocument()
  })
})

describe('Analysis & Validations: place in the Analysis step (design D1)', () => {
  it('goes after the warnings of the analysis and before the table of rows', async () => {
    await openAnalysis(seedImport('batch-issues', { status: 'analyzed' }).importId)
    const warnings = screen.getByRole('region', { name: 'Warnings' })
    const validations = screen.getByRole('region', { name: 'Validations' })
    const rows = await screen.findByRole('table', { name: 'Rows' })

    await waitFor(() => {
      expect(warnings.compareDocumentPosition(validations) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(validations.compareDocumentPosition(rows) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })
})
