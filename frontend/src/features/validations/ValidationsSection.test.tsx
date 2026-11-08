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
/** The row of the title: the heading, then the overall result of the run. */
const titleRow = () => section().getByRole('heading', { name: 'Validations' }).parentElement!
const overall = () => within(titleRow())
const RANGES_TITLE = 'Date ranges used by the validations'
const rangesTable = () => within(runHeader().getByRole('table', { name: RANGES_TITLE }))
const rangeHeaders = () =>
  rangesTable()
    .getAllByRole('columnheader')
    .map((h) => h.textContent)
const rangeRows = () =>
  rangesTable()
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    )
const COUNTERS = ['Pending in range', 'Undated adjustments', 'Undated candidates'] as const
const countersRegion = () => within(runHeader().getByRole('region', { name: 'Informative counters' }))
/** The card of a counter: a region named by its label (web-analysis-polish design D3). */
const counterCard = (label: string) => countersRegion().getByRole('region', { name: label })
const aboutButton = (label: string) => within(counterCard(label)).getByRole('button', { name: `About ${label}` })
/** Each counter as [name, value]: the value is the line below the label of its card. */
const counters = () => COUNTERS.map((label) => [label, counterCard(label).children[1]?.textContent])
const EXPLAIN = {
  'Pending in range':
    "Transactions of the account's channels still Pending on the gateway, created within the APP or DEC range.",
  'Undated adjustments': 'Rows of this batch in cycle I without a status-change date.',
  'Undated candidates':
    'Gateway transactions in a cycle I status without a status-change date: they cannot be compared with the I range.',
} as const
/** Tabs, as a keyboard user would, until the element has the focus. */
async function tabTo(user: { tab: () => Promise<void> }, element: HTMLElement) {
  for (let i = 0; i < 100 && document.activeElement !== element; i++) await user.tab()
  expect(element).toHaveFocus()
}
const resultRows = () =>
  within(screen.getByRole('table', { name: 'Validation results' }))
    .getAllByRole('row')
    .slice(1)
/** The element that holds the breakdown, inside the Breakdown cell of a row of the validations. */
const breakdownOf = (row: HTMLElement) => within(row).getAllByRole('cell')[4]!.firstElementChild as HTMLElement

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
  it('batch-issues: Warnings, the run with its date in ET and its user, the table of ranges and the counters explained', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { runId } = seedValidationRun(importId)
    await openAnalysis(importId)

    // Next to the title: the label, the overall result and, as secondary text, the run. The fake's audit clock starts
    // at 14:00 UTC, 10:00 in New York (EDT).
    expect(titleRow()).toHaveTextContent(
      `ValidationsOverall resultWarningsRun #${runId} · 2026-10-18 10:00 ET · analyst`,
    )
    expect(overall().getByText('Warnings')).toHaveAttribute('data-slot', 'badge')
    expect(runHeader().queryByText('Warnings')).not.toBeInTheDocument()
    // The table of ranges in its own card, which titles it.
    const card = runHeader().getByRole('table', { name: RANGES_TITLE }).closest<HTMLElement>('[data-slot="card"]')
    expect(within(card!).getByText(RANGES_TITLE)).toHaveAttribute('data-slot', 'card-title')
    // Six rows by cycle and status, one I range for CHB, REF and RDR, and no Transactions column (#87).
    expect(rangeHeaders()).toEqual(['Cycle', 'Status', 'Date range'])
    expect(rangeRows()).toEqual([
      ['E', 'APP', '2026-09-28 00:00 ET – 2026-10-07 23:59 ET'],
      ['E', 'DEC', '2026-09-29 00:00 ET – 2026-10-07 23:59 ET'],
      ['I', 'CHB', '2026-09-28 00:00 ET – 2026-10-11 00:00 ET'],
      ['I', 'REF'],
      ['I', 'RDR'],
      ['R', '—', '2026-03-31 00:00 ET – 2026-04-09 00:00 ET'],
    ])
    // Each counter in its card with its value, and what it counts as the description of its info button; none of them
    // is a finding, which stays in view (web-analysis-polish design D3, D4).
    expect(counters()).toEqual([
      ['Pending in range', '0'],
      ['Undated adjustments', '1'],
      ['Undated candidates', '0'],
    ])
    for (const label of COUNTERS) expect(aboutButton(label)).toHaveAccessibleDescription(EXPLAIN[label])
    expect(runHeader().getByText('Informative: none of them is a finding.')).toBeInTheDocument()
  })

  it('batch-issues: the ranges card is centred and keeps the width of its table', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    // jsdom does not lay out: the classes that centre it; the screenshots measure it (design D1, D7).
    const card = runHeader().getByRole('table', { name: RANGES_TITLE }).closest<HTMLElement>('[data-slot="card"]')
    expect(card).toHaveClass('mx-auto', 'w-fit')
  })

  it('batch-issues: three counter cards in three columns from sm, none of them a warning', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    const cards = COUNTERS.map(counterCard)
    // One grid holds the three cards, one per row below sm and three columns from it.
    const grid = cards[0]!.parentElement!
    expect(grid).toHaveClass('grid', 'sm:grid-cols-3')
    expect(cards.every((card) => card.parentElement === grid)).toBe(true)
    // Informative: Undated adjustments 1 is not highlighted.
    for (const card of cards) expect(card).not.toHaveAttribute('data-state')
  })

  it('batch-issues: each explanation is once in its card, with the tooltip closed and open', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user } = await openAnalysis(importId)

    for (const label of COUNTERS) expect(within(counterCard(label)).getAllByText(EXPLAIN[label])).toHaveLength(1)

    await tabTo(user, aboutButton('Pending in range'))
    expect(await screen.findByRole('tooltip')).toHaveTextContent(EXPLAIN['Pending in range'])
    // The tooltip goes in a portal, out of the card: the card still has the explanation once.
    expect(within(counterCard('Pending in range')).getAllByText(EXPLAIN['Pending in range'])).toHaveLength(1)
  })

  it('batch-issues: Tab reaches About Pending in range, its tooltip opens, and Escape closes it keeping the focus', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user } = await openAnalysis(importId)

    const button = aboutButton('Pending in range')
    await tabTo(user, button)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(EXPLAIN['Pending in range'])

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('batch-blocked: Blocked next to the title and no table of ranges', async () => {
    const { importId } = seedImport('batch-blocked', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    expect(overall().getByText('Blocked')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: RANGES_TITLE })).not.toBeInTheDocument()
    expect(runHeader().getByRole('region', { name: 'Informative counters' })).toBeInTheDocument()
  })

  it('a range without rows is — (spec "Rango sin filas")', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const fixture = batchIssuesFixture()
    fixture.ranges = { ...fixture.ranges, DEC: null }
    seedValidationRun(importId, fixture)
    await openAnalysis(importId)

    expect(rangeRows()[1]).toEqual(['E', 'DEC', '—'])
  })

  it('a run without warnings is Passed', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    expect(overall().getByText('Passed')).toBeInTheDocument()
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

  it('batch-issues: the breakdown wraps between words in a fixed width, so the table fits at 1024 px', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    // jsdom does not lay out: the classes that wrap it; the screenshots measure the table (web-analysis-polish D8).
    const breakdown = breakdownOf(resultRows()[1]!)
    expect(breakdown).toHaveTextContent('1 non-recorded adjustment · 2 status mismatches')
    expect(breakdown).toHaveClass('block', 'w-48', 'whitespace-normal')
    expect(breakdown.className).not.toMatch(/overflow-wrap|break-all/)
  })

  it('batch-issues: each part of the breakdown stays whole, so it wraps only at the ·', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    // A figure never ends up on a line away from its text (web-analysis-polish D8).
    const parts = (row: HTMLElement) => [...breakdownOf(row).children]
    expect(parts(resultRows()[1]!).map((part) => part.textContent)).toEqual([
      '1 non-recorded adjustment',
      '2 status mismatches',
    ])
    expect(parts(resultRows()[7]!).map((part) => part.textContent)).toEqual(['APP 3', 'R 3'])
    for (const part of [...parts(resultRows()[1]!), ...parts(resultRows()[7]!)]) {
      expect(part).toHaveClass('whitespace-nowrap')
    }
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
