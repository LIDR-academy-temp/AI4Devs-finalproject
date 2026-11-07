import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChannelNoticeItem } from '@/lib/api/types'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import { OTHER_PROVIDER_NOTE } from '@/test/msw/import-fixtures'
import { importRecord, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'

const OTHER_ACCOUNT_NOTE = 'This account will become the primary account of the channel when the batch is processed'

async function openAnalysis(importId: string) {
  renderApp(`/imports/${importId}?step=analysis`, { as: 'analyst' })
  await screen.findByRole('region', { name: 'Rows read' })
}

const notice = () => screen.queryByRole('region', { name: 'Channels to review' })
const items = () => within(notice()!).getAllByRole('listitem')

/** A channel of the analyzed import, as the API lists it (spec "Aviso de canales"). */
const channel = (overrides: Partial<ChannelNoticeItem>): ChannelNoticeItem => ({
  channelId: 1003,
  name: 'RAM-03',
  gatewayId: 1,
  providerId: 101,
  rowCount: 4,
  assignment: 'assigned',
  otherAccount: null,
  note: null,
  ...overrides,
})

describe('Analysis: channel notice (spec "Resultado del análisis: aviso de canales")', () => {
  it('batch-clean shows only RAM-07, not assigned yet, with its note', async () => {
    await openAnalysis(seedImport('batch-clean', { status: 'analyzed' }).importId)

    expect(items()).toHaveLength(1)
    expect(items()[0]).toHaveTextContent('RAM-07 is not assigned yet')
    expect(items()[0]).toHaveTextContent('30 rows')
    expect(items()[0]).toHaveTextContent('it will be associated to this account as primary when the batch is processed')
    expect(items()[0]).not.toHaveAttribute('data-other-provider')
    expect(within(notice()!).queryByText(/RAM-01|RAM-02/)).not.toBeInTheDocument()
  })

  it('a channel of the same provider primary in another account: RAM-03 is primary in ProviderA-EUR', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    importRecord(importId).channels = [
      channel({
        assignment: 'assigned_to_other_account',
        otherAccount: { accountId: ACCOUNT_IDS['ProviderA-EUR'], name: 'ProviderA-EUR' },
        note: OTHER_ACCOUNT_NOTE,
      }),
    ]
    await openAnalysis(importId)

    expect(items()).toHaveLength(1)
    expect(items()[0]).toHaveTextContent('RAM-03 is primary in ProviderA-EUR')
    expect(items()[0]).toHaveTextContent('4 rows')
    expect(items()[0]).toHaveTextContent(OTHER_ACCOUNT_NOTE)
  })

  it('shows a channel of another merchant without any of its data', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    importRecord(importId).channels = [
      channel({
        channelId: 2001,
        name: null,
        providerId: null,
        rowCount: 2,
        assignment: 'unassigned',
        note: OTHER_PROVIDER_NOTE,
        outOfScope: true,
        otherProvider: true,
      }),
    ]
    await openAnalysis(importId)

    expect(items()).toHaveLength(1)
    expect(items()[0]).toHaveTextContent('Channel 2001 (another merchant)')
    expect(items()[0]).toHaveTextContent('2 rows')
    expect(items()[0]).toHaveTextContent(OTHER_PROVIDER_NOTE)
    expect(items()[0]).not.toHaveTextContent(/not assigned yet|belongs to/)
    expect(notice()).not.toHaveTextContent(/RAM-U1|ProviderC|Provider C|Merchant B/)
  })

  it('does not appear when every channel is assigned and of the account provider', async () => {
    await openAnalysis(seedImport('legacy-provider', { status: 'analyzed' }).importId)

    expect(notice()).not.toBeInTheDocument()
  })
})

describe('Analysis: channel of another provider (spec "Resultado del análisis: canal de otro proveedor")', () => {
  it('batch-blocked in ProviderB-Main: RAM-01 belongs to another provider, with one row and its note', async () => {
    await openAnalysis(seedImport('batch-blocked', { status: 'analyzed' }).importId)

    const ram01 = items().find((item) => item.textContent?.includes('RAM-01'))!
    expect(ram01).toHaveAttribute('data-other-provider')
    expect(ram01).toHaveTextContent('RAM-01 belongs to another provider')
    expect(ram01).toHaveTextContent('1 row')
    expect(ram01).toHaveTextContent(OTHER_PROVIDER_NOTE)
    expect(ram01).not.toHaveTextContent(/is primary in|is not assigned yet|will become|will be associated/)
  })

  it('an assigned channel of another provider makes the notice appear', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    importRecord(importId).channels = [
      channel({ channelId: 1011, name: 'RAM-11', providerId: 102, note: OTHER_PROVIDER_NOTE, otherProvider: true }),
    ]
    await openAnalysis(importId)

    expect(items()).toHaveLength(1)
    expect(items()[0]).toHaveAttribute('data-other-provider')
    expect(items()[0]).toHaveTextContent('RAM-11 belongs to another provider')
  })
})
