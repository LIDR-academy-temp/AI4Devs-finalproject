import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

async function openAnalysis(importId: string) {
  const view = renderApp(`/imports/${importId}?step=analysis`, { as: 'analyst' })
  await screen.findByRole('region', { name: strings.analysis.counters.read })
  return view
}

const counter = (name: string) => screen.getByRole('region', { name })
const warnings = () => within(screen.getByRole('region', { name: strings.analysis.warnings.title }))

describe('Analysis: counters (spec "Resultado del análisis: contadores")', () => {
  it('batch-clean: 783 read, 780 matched, 3 ignored and the rows by cycle, without highlight', async () => {
    await openAnalysis(seedImport('batch-clean', { status: 'analyzed' }).importId)
    const c = strings.analysis.counters

    expect(counter(c.read)).toHaveTextContent('783')
    expect(counter(c.matched)).toHaveTextContent('780')
    expect(counter(c.unmatched)).toHaveTextContent('0')
    expect(counter(c.ambiguous)).toHaveTextContent('0')
    expect(counter(c.ignored)).toHaveTextContent('3')
    expect(counter(c.byCycle)).toHaveTextContent('E 450 · I 10 · R 320')
    expect(counter(c.unmatched)).not.toHaveAttribute('data-state', 'warning')
    expect(counter(c.ambiguous)).not.toHaveAttribute('data-state', 'warning')
  })

  it('batch-issues: one unmatched row, highlighted', async () => {
    await openAnalysis(seedImport('batch-issues', { status: 'analyzed' }).importId)
    const c = strings.analysis.counters

    expect(counter(c.read)).toHaveTextContent('770')
    expect(counter(c.matched)).toHaveTextContent('766')
    expect(counter(c.unmatched)).toHaveTextContent('1')
    expect(counter(c.unmatched)).toHaveAttribute('data-state', 'warning')
    expect(counter(c.ambiguous)).toHaveTextContent('0')
    expect(counter(c.ignored)).toHaveTextContent('3')
    expect(counter(c.byCycle)).toHaveTextContent('E 440 · I 10 · R 317')
  })
})

describe('Analysis: warnings (spec "Resultado del análisis: advertencias")', () => {
  it('batch-issues lists Negative amount with 1 and no other code', async () => {
    await openAnalysis(seedImport('batch-issues', { status: 'analyzed' }).importId)

    const items = warnings().getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Negative amount')
    expect(items[0]).toHaveTextContent('1')
  })

  it('batch-clean says No warnings', async () => {
    await openAnalysis(seedImport('batch-clean', { status: 'analyzed' }).importId)

    expect(warnings().getByText('No warnings')).toBeInTheDocument()
  })
})
