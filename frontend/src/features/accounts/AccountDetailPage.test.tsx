import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { auditInstant, formatAuditDate, formatAuditDateTime } from '@/lib/format'
import { ACCOUNT_IDS, ACCOUNTS, type UserName } from '@/test/msw/fixtures'
import { db } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Spec accounts "Pantalla Account Detail: …" (web-admin-accounts design D2, D4). The account and its channels come
// from the fake catalog; the screen only shows them and offers the actions by permission and by isActive.
const USD = ACCOUNT_IDS['ProviderA-USD']
const EUR = ACCOUNT_IDS['ProviderA-EUR']
const ALT = ACCOUNT_IDS['ProviderC-Alt']
const NEW = '0b6f4c1e-1a2b-4c3d-8e4f-0000000000aa'

async function openAccount(as: UserName, accountId: string = USD) {
  const rendered = renderApp(`/accounts/${accountId}`, { as })
  const name = ACCOUNTS.find((a) => a.accountId === accountId)?.name
  await screen.findByRole('heading', { level: 1, name }, OPENING)
  return rendered
}

const header = () => within(screen.getByRole('region', { name: 'Account' }))

/** The links to the sections of the account: plain links, the current one marked aria-current="page". */
const sections = () => within(screen.getByRole('navigation', { name: 'Account sections' }))

/** The value next to a label of the General card. */
async function generalValue(label: string) {
  const term = await screen.findByText(label, { selector: 'dt' })
  return term.nextElementSibling?.textContent
}

const channelsTable = () => screen.findByRole('table', { name: 'Channels of the account' })

async function channelRows() {
  const table = await channelsTable()
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    )
}

function addClosedAccount() {
  db.accounts.push({ ...ACCOUNTS[0]!, accountId: NEW, name: 'ProviderA-Old', isActive: false })
}

describe('Account Detail: access and header', () => {
  it('shows the name, the status, merchant and provider, and Settlements', async () => {
    await openAccount('viewer')

    expect(header().getByText('active')).toBeInTheDocument()
    expect(header().getByText('Merchant A › Provider A')).toBeInTheDocument()
    expect(header().getByRole('link', { name: 'Settlements' })).toHaveAttribute(
      'href',
      `/settlements?merchantId=1&providerId=101&accountId=${USD}`,
    )
  })

  it.each([
    ['of another merchant', ALT],
    ['that does not exist', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
  ])('an account %s is not available', async (_case, accountId) => {
    renderApp(`/accounts/${accountId}`, { as: 'viewer' })

    expect(await screen.findByText('This account is not available.', undefined, OPENING)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Account sections' })).not.toBeInTheDocument()
  })

  it('a malformed id (400 of the API) is not available either', async () => {
    server.use(
      http.get('*/api/v1/accounts/not-a-uuid', () =>
        HttpResponse.json({ code: 'validation_error', message: 'Invalid request' }, { status: 400 }),
      ),
    )
    renderApp('/accounts/not-a-uuid', { as: 'viewer' })

    expect(await screen.findByText('This account is not available.', undefined, OPENING)).toBeInTheDocument()
  })

  it('shows its place in the map with static crumbs', async () => {
    await openAccount('viewer')

    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(crumbs.getByText('Administration')).toBeInTheDocument()
    expect(crumbs.getByText('Accounts')).toBeInTheDocument()
    expect(crumbs.getByText('Account detail')).toHaveAttribute('aria-current', 'page')
  })
})

describe('Account Detail: actions of the header', () => {
  it('admin on an open account: Edit, Close… and New reconciliation, not Reopen…', async () => {
    await openAccount('admin')

    expect(header().getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(header().getByRole('button', { name: 'Close…' })).toBeInTheDocument()
    expect(header().getByRole('link', { name: 'New reconciliation' })).toBeInTheDocument()
    expect(header().queryByRole('button', { name: 'Reopen…' })).not.toBeInTheDocument()
  })

  it('analyst: New reconciliation with the account chosen, and none of the account.manage actions', async () => {
    await openAccount('analyst')

    expect(header().getByRole('link', { name: 'New reconciliation' })).toHaveAttribute(
      'href',
      `/reconciliations/new?merchantId=1&providerId=101&accountId=${USD}`,
    )
    for (const name of ['Edit', 'Close…', 'Reopen…']) {
      expect(header().queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('viewer sees none of the four actions', async () => {
    await openAccount('viewer')

    expect(header().queryAllByRole('button')).toEqual([])
    expect(header().queryByRole('link', { name: 'New reconciliation' })).not.toBeInTheDocument()
  })

  it('a closed account: closed, Edit and Reopen…, no Close… nor New reconciliation', async () => {
    addClosedAccount()
    renderApp(`/accounts/${NEW}`, { as: 'admin' })
    await screen.findByRole('heading', { level: 1, name: 'ProviderA-Old' }, OPENING)

    expect(header().getByText('closed')).toBeInTheDocument()
    expect(header().getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(header().getByRole('button', { name: 'Reopen…' })).toBeInTheDocument()
    expect(header().queryByRole('button', { name: 'Close…' })).not.toBeInTheDocument()
    expect(header().queryByRole('link', { name: 'New reconciliation' })).not.toBeInTheDocument()
  })
})

describe('Account Detail: tabs', () => {
  it('the Fees tab changes the address and keeps the header', async () => {
    const { user, router } = await openAccount('viewer')
    expect(sections().getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    expect(sections().getByRole('link', { name: 'Fees' })).not.toHaveAttribute('aria-current')

    await user.click(sections().getByRole('link', { name: 'Fees' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/accounts/${USD}/fees`))
    expect(sections().getByRole('link', { name: 'Fees' })).toHaveAttribute('aria-current', 'page')
    expect(sections().getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('heading', { level: 1, name: 'ProviderA-USD' })).toBeInTheDocument()
  })

  it('a direct link opens the Fees tab', async () => {
    renderApp(`/accounts/${USD}/fees`, { as: 'viewer' })

    await screen.findByRole('heading', { level: 1, name: 'ProviderA-USD' }, OPENING)
    expect(sections().getByRole('link', { name: 'Fees' })).toHaveAttribute('aria-current', 'page')
  })

  it('offers no tab for matching rules, settlements or activity, and no tab roles: the sections are links', async () => {
    await openAccount('viewer')

    expect(
      sections()
        .getAllByRole('link')
        .map((t) => t.textContent),
    ).toEqual(['Overview', 'Fees'])
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('tab')).toEqual([])
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()
  })
})

describe('Account Detail: Overview', () => {
  it('ProviderA-EUR: policy, cap from the decimal text, global rules, who created it and the last change', async () => {
    await openAccount('viewer', EUR)
    const eur = ACCOUNTS.find((a) => a.accountId === EUR)!

    expect(await generalValue('Merchant / Provider')).toBe('Merchant A › Provider A')
    expect(await generalValue('Reserve policy on chargeback')).toBe('hold_until_term')
    expect(await generalValue('Reserve cap')).toBe('50,000.0000')
    expect(await generalValue('Matching rules')).toBe('None · global rules')
    expect(await generalValue('Created')).toBe(`${formatAuditDate(auditInstant(eur.createdAt))} by admin`)
    expect(await generalValue('Last change')).toBe(formatAuditDateTime(auditInstant(eur.createdAt)))
  })

  it('ProviderC-Alt shows its rule set by name and no cap', async () => {
    await openAccount('admin', ALT)

    await waitFor(async () => expect(await generalValue('Matching rules')).toBe('Provider C legacy'))
    expect(await generalValue('Reserve cap')).toBe('none')
  })

  // The rule set belongs to the provider and is shared by its accounts: a link, not a tab (web-admin-matching D9).
  it('the rule set links to its detail in Matching Rules', async () => {
    await openAccount('admin', ALT)
    expect(await screen.findByRole('link', { name: 'Provider C legacy' })).toHaveAttribute('href', '/matching-rules/3')
  })

  it('without a rule set, None · global rules links to the global rules', async () => {
    await openAccount('viewer', EUR)
    expect(await screen.findByRole('link', { name: 'None · global rules' })).toHaveAttribute(
      'href',
      '/matching-rules/global',
    )
  })

  it('has no tab for the matching rules', async () => {
    await openAccount('admin', ALT)
    expect(
      sections()
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Overview', 'Fees'])
  })
})

describe('Account Detail: channels', () => {
  it('lists the primary channels of ProviderA-USD with gateway, batch, term and reserve', async () => {
    await openAccount('viewer')

    expect(
      within(await channelsTable())
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Channel', 'Gateway', 'Role here', 'Since', 'Term · reserve'])
    expect(await channelRows()).toEqual([
      ['RAM-01', 'Gateway 1', 'primary', 'batch 68', '14 d · 10 % / 180 d'],
      ['RAM-02', 'Gateway 1', 'primary', 'batch 68', '14 d · 10 % / 180 d'],
    ])
  })

  it('a historical channel names the current primary account', async () => {
    db.accountChannels.push({ accountId: EUR, channelId: 1001, isPrimary: false })
    await openAccount('admin', EUR)

    await waitFor(async () =>
      expect((await channelRows()).map((r) => [r[0], r[2]])).toEqual([
        ['RAM-01', 'historical · primary in ProviderA-USD'],
        ['RAM-03', 'primary'],
      ]),
    )
  })

  it('an association no batch created shows a dash', async () => {
    db.accountChannels.push({ accountId: EUR, channelId: 1001, isPrimary: false, assignedInBatchNo: null })
    await openAccount('admin', EUR)

    await waitFor(async () => expect((await channelRows())[0]?.[3]).toBe('—'))
  })

  it('an account without channels says how channels join it', async () => {
    db.accounts.push({ ...ACCOUNTS[0]!, accountId: NEW, name: 'ProviderA-New' })
    renderApp(`/accounts/${NEW}`, { as: 'admin' })

    expect(
      await screen.findByText(
        'No channels yet. Channels join an account with the first processed settlement that includes them.',
        undefined,
        OPENING,
      ),
    ).toBeInTheDocument()
  })

  it('explains that channels are never attached by hand', async () => {
    await openAccount('viewer')

    expect(await screen.findByText(/Channels are never attached by hand/)).toBeInTheDocument()
  })
})

describe('Account Detail: loading and errors', () => {
  it('a failed read of the channels shows Could not load the account. and Retry asks again', async () => {
    server.use(
      http.get(
        `*/api/v1/accounts/${USD}/channels`,
        () => HttpResponse.json({ code: 'internal_error' }, { status: 500 }),
        {
          once: true,
        },
      ),
    )
    const { user } = await openAccount('viewer')

    expect(await screen.findByText('Could not load the account.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect((await channelRows()).map((r) => r[0])).toEqual(['RAM-01', 'RAM-02'])
  })

  it('without the rule sets, the Overview shows the id of the rule set and the rest of the account', async () => {
    server.use(
      http.get('*/api/v1/providers/201/matching-rule-sets', () =>
        HttpResponse.json({ code: 'not_implemented' }, { status: 501 }),
      ),
    )
    await openAccount('admin', ALT)

    await waitFor(async () => expect(await generalValue('Matching rules')).toBe('Rule set 3'))
    expect(await generalValue('Reserve policy on chargeback')).toBe('hold_until_term')
    expect((await channelRows()).map((r) => r[0])).toEqual(['RAM-U2'])
  })
})
