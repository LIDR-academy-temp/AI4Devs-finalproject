import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS, type UserName } from '@/test/msw/fixtures'
import { db } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Spec accounts "Pantalla Channel Assignment: …" (web-admin-accounts design D8). The channels, their primary
// account and their associations come from the fake catalog; the screen only filters and shows them.
async function open(as: UserName, search = '') {
  const rendered = renderApp(`/channel-assignment${search ? `?${search}` : ''}`, { as })
  await screen.findByRole('heading', { level: 1, name: 'Channel Assignment' }, OPENING)
  return rendered
}

const section = (name: RegExp) => within(screen.getByRole('region', { name }))

async function rowsOf(tableName: string) {
  const table = await screen.findByRole('table', { name: tableName }, OPENING)
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    )
}

describe('Channel Assignment: access and filters', () => {
  it('viewer sees the channels of Provider A and Provider B, none of Provider C, and no action', async () => {
    await open('viewer')

    const unassigned = await rowsOf('Channels not assigned yet')
    const primaries = await rowsOf('Primary account per channel')
    const names = [...unassigned, ...primaries].map((r) => r[0])
    expect(names.sort()).toEqual(['RAM-01', 'RAM-02', 'RAM-03', 'RAM-07', 'RAM-11', 'RAM-12', 'RAM-13'])
    expect(screen.queryAllByRole('button').filter((b) => /assign|move/i.test(b.textContent ?? ''))).toEqual([])
    expect(screen.getByText(/undoing a batch does not move the primary/i)).toBeInTheDocument()
  })

  it('the provider filter goes to the address and narrows both sections', async () => {
    const { user, router } = await open('admin')

    await user.selectOptions(screen.getByLabelText('Merchant'), 'Merchant A')
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Provider' }), 'Provider B')

    await waitFor(() => expect(router.state.location.search).toEqual({ merchantId: 1, providerId: 102 }))
    expect((await rowsOf('Channels not assigned yet')).map((r) => r[0])).toEqual(['RAM-13'])
    expect((await rowsOf('Primary account per channel')).map((r) => r[0])).toEqual(['RAM-11', 'RAM-12'])
  })

  it('choosing a merchant clears the provider', async () => {
    const { user, router } = await open('admin', 'merchantId=1&providerId=102')

    await user.selectOptions(await screen.findByLabelText('Merchant'), 'Merchant B')

    await waitFor(() => expect(router.state.location.search).toEqual({ merchantId: 2 }))
  })

  it('a provider outside the scope is not available', async () => {
    renderApp('/channel-assignment?merchantId=2&providerId=201', { as: 'viewer' })

    expect(
      await screen.findByText('This merchant or provider is not available.', undefined, OPENING),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('Channel Assignment: channels not assigned yet', () => {
  it('lists the two new channels of the seed with gateway, merchant and provider, term and reserve', async () => {
    await open('viewer')

    expect(section(/Not assigned yet/).getByRole('heading', { name: 'Not assigned yet (2)' })).toBeInTheDocument()
    expect(await rowsOf('Channels not assigned yet')).toEqual([
      ['RAM-07', 'Gateway 1', 'Merchant A › Provider A', '14 d · 10 % / 180 d'],
      ['RAM-13', 'Gateway 1', 'Merchant A › Provider B', '10 d · 5 % / 120 d'],
    ])
  })

  it('a provider without such channels says so', async () => {
    await open('admin', 'merchantId=2&providerId=201')

    expect(await screen.findByText('Every channel with transactions has an account.')).toBeInTheDocument()
  })
})

describe('Channel Assignment: primary account per channel', () => {
  it('the primaries of Provider A, with the batch since which they are, and no historical account', async () => {
    await open('viewer', 'merchantId=1&providerId=101')

    await waitFor(async () =>
      expect(await rowsOf('Primary account per channel')).toEqual([
        ['RAM-01', 'Provider A', 'ProviderA-USD', 'batch 68', '—'],
        ['RAM-02', 'Provider A', 'ProviderA-USD', 'batch 68', '—'],
        ['RAM-03', 'Provider A', 'ProviderA-EUR', 'batch 68', '—'],
      ]),
    )
  })

  it('a channel with a historical account names it', async () => {
    db.accountChannels.push({ accountId: ACCOUNT_IDS['ProviderA-EUR'], channelId: 1001, isPrimary: false })
    await open('admin', 'merchantId=1&providerId=101')

    await waitFor(async () =>
      expect((await rowsOf('Primary account per channel'))[0]).toEqual([
        'RAM-01',
        'Provider A',
        'ProviderA-USD',
        'batch 68',
        'ProviderA-EUR',
      ]),
    )
  })

  it('the primary account leads to its detail', async () => {
    const { user, router } = await open('viewer', 'merchantId=1&providerId=101')

    const table = await screen.findByRole('table', { name: 'Primary account per channel' })
    await user.click(await within(table).findByRole('link', { name: 'ProviderA-EUR' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/accounts/${ACCOUNT_IDS['ProviderA-EUR']}`))
  })
})

describe('Channel Assignment: loading and errors', () => {
  it('a failed read shows Could not load channels. and Retry asks again', async () => {
    server.use(
      http.get('*/api/v1/channels', () => HttpResponse.json({ code: 'internal_error' }, { status: 500 }), {
        once: true,
      }),
    )
    const { user } = await open('viewer')

    expect(await screen.findByText('Could not load channels.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect((await rowsOf('Channels not assigned yet')).map((r) => r[0])).toEqual(['RAM-07', 'RAM-13'])
  })
})
