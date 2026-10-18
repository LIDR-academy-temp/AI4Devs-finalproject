import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { importRecord, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

async function openAnalysis(importId: string) {
  const view = renderApp(`/imports/${importId}?step=analysis`, { as: 'analyst' })
  await screen.findByRole('region', { name: strings.analysis.counters.read })
  return view
}

const counter = (name: string) => screen.getByRole('region', { name })
const notice = () => screen.queryByRole('region', { name: strings.analysis.channels.title })
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

describe('Analysis: channel notice (spec "Resultado del análisis: aviso de canales")', () => {
  it('batch-clean shows only RAM-07, not assigned yet, with its note', async () => {
    await openAnalysis(seedImport('batch-clean', { status: 'analyzed' }).importId)

    const items = within(notice()!).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('RAM-07 is not assigned yet')
    expect(items[0]).toHaveTextContent('30 rows')
    expect(items[0]).toHaveTextContent('it will be associated to this account as primary when the batch is processed')
    expect(within(notice()!).queryByText(/RAM-01|RAM-02/)).not.toBeInTheDocument()
  })

  it('batch-blocked shows RAM-01 as primary in ProviderA-USD with one row', async () => {
    await openAnalysis(seedImport('batch-blocked', { status: 'analyzed' }).importId)

    const [item] = within(notice()!).getAllByRole('listitem')
    expect(item).toHaveTextContent('RAM-01 is primary in ProviderA-USD')
    expect(item).toHaveTextContent('1 row')
  })

  it('shows channels and accounts of another merchant without any of their data', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    importRecord(importId).channels = [
      {
        channelId: 2001,
        name: null,
        gatewayId: 1,
        providerId: null,
        rowCount: 2,
        assignment: 'unassigned',
        otherAccount: null,
        note: null,
        outOfScope: true,
      },
      {
        channelId: 1003,
        name: 'RAM-03',
        gatewayId: 1,
        providerId: 101,
        rowCount: 4,
        assignment: 'assigned_to_other_account',
        otherAccount: { accountId: null, name: null, outOfScope: true },
        note: null,
      },
    ]
    await openAnalysis(importId)

    const [hiddenChannel, hiddenAccount] = within(notice()!).getAllByRole('listitem')
    expect(hiddenChannel).toHaveTextContent('Channel 2001 (another merchant)')
    expect(hiddenAccount).toHaveTextContent('RAM-03 is primary in an account of another merchant')
    expect(notice()).not.toHaveTextContent(/RAM-U1|ProviderC|Merchant B/)
  })

  it('does not appear when every channel is assigned', async () => {
    await openAnalysis(seedImport('legacy-provider', { status: 'analyzed', account: 'ProviderA-USD' }).importId)

    expect(notice()).not.toBeInTheDocument()
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
