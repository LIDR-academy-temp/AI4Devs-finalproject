import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { accountRequests, RULE_SET_IDS, respondNextAccount } from '@/test/msw/accounts'
import { ACCOUNT_IDS, ACCOUNTS, type UserName } from '@/test/msw/fixtures'
import { db } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Spec accounts "Pantalla New account", "Pantalla Edit account", "Pantalla Close / Reopen de una cuenta" and
// "Formularios de cuenta: errores del API" (web-admin-accounts design D5–D7). The fake stores the writes; the domain
// answers (a taken name, a rule set no longer valid) are scripted with respondNextAccount.
const USD = ACCOUNT_IDS['ProviderA-USD']
const EUR = ACCOUNT_IDS['ProviderA-EUR']
const ALT = ACCOUNT_IDS['ProviderC-Alt']
const OLD = '0b6f4c1e-1a2b-4c3d-8e4f-0000000000bb'
const CREATED = 'a1000000-0000-4000-8000-000000000001'

async function openAccounts(search: string, as: UserName = 'admin') {
  const rendered = renderApp(`/accounts?${search}`, { as })
  await screen.findByRole('table', undefined, OPENING)
  return rendered
}

async function openNewAccount(search = 'merchantId=2&providerId=201') {
  const rendered = await openAccounts(search)
  await rendered.user.click(screen.getByRole('button', { name: 'New account' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'New account' }))
  return { ...rendered, dialog }
}

async function openDetail(accountId: string, name: string) {
  const rendered = renderApp(`/accounts/${accountId}`, { as: 'admin' })
  await screen.findByRole('heading', { level: 1, name }, OPENING)
  return rendered
}

async function openEdit(accountId: string, name: string) {
  const rendered = await openDetail(accountId, name)
  await rendered.user.click(screen.getByRole('button', { name: 'Edit' }))
  const sheet = within(await screen.findByRole('dialog', { name: `Edit ${name}` }))
  return { ...rendered, sheet }
}

const header = () => within(screen.getByRole('region', { name: 'Account' }))

async function generalValue(label: string) {
  const term = await screen.findByText(label, { selector: 'dt' })
  return term.nextElementSibling?.textContent
}

const optionsOf = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    .map((o) => o.textContent)

function addClosedAccount() {
  db.accounts.push({ ...ACCOUNTS[0]!, accountId: OLD, name: 'ProviderA-Old', isActive: false })
}

describe('New account: the form', () => {
  it.each(['analyst', 'viewer'] as const)('%s does not see New account', async (as) => {
    await openAccounts('merchantId=1&providerId=101', as)

    expect(screen.queryByRole('button', { name: 'New account' })).not.toBeInTheDocument()
  })

  it('creates the minimal account in the provider of the page and opens its detail', async () => {
    const { user, dialog, router } = await openNewAccount()

    expect(dialog.getByLabelText('Merchant')).toHaveValue('2')
    expect(dialog.getByLabelText('Provider')).toHaveValue('201')
    expect(dialog.getByText(/Name must be unique/)).toBeInTheDocument()
    await user.type(dialog.getByLabelText('Name'), 'ProviderC-New')
    await user.click(dialog.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/accounts/${CREATED}`))
    expect(await screen.findByRole('heading', { level: 1, name: 'ProviderC-New' })).toBeInTheDocument()
    expect(accountRequests('create')).toMatchObject([
      {
        url: '/api/v1/providers/201/accounts',
        body: {
          name: 'ProviderC-New',
          chargebackReservePolicy: 'hold_until_term',
          rollingReserveCapAmt: null,
          matchingRuleSetId: null,
          copyFeesFromAccountId: null,
        },
      },
    ])
  })

  it('sends the cap as the text written', async () => {
    const { user, dialog } = await openNewAccount()

    await user.type(dialog.getByLabelText('Name'), 'ProviderC-New')
    await user.selectOptions(dialog.getByLabelText('Reserve policy on chargeback'), 'release_on_chargeback')
    await user.type(dialog.getByLabelText('Reserve cap (optional, USD)'), '25000.5')
    await user.click(dialog.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(accountRequests('create')).toHaveLength(1))
    expect(accountRequests('create')[0]?.body).toMatchObject({
      chargebackReservePolicy: 'release_on_chargeback',
      rollingReserveCapAmt: '25000.5',
    })
  })

  it.each([
    ['an empty name', '', '', 'Name', 'Name is required.'],
    ['a name of 51 characters', 'x'.repeat(51), '', 'Name', 'Use at most 50 characters.'],
    [
      'a negative cap',
      'ProviderC-New',
      '-1',
      'Reserve cap (optional, USD)',
      'Enter an amount ≥ 0 with up to 4 decimals.',
    ],
    [
      'a cap with 5 decimals',
      'ProviderC-New',
      '1.23456',
      'Reserve cap (optional, USD)',
      'Enter an amount ≥ 0 with up to 4 decimals.',
    ],
  ])(
    'refuses %s next to its field, with the focus there, without sending',
    async (_case, name, cap, field, message) => {
      const { user, dialog } = await openNewAccount()

      if (name) await user.type(dialog.getByLabelText('Name'), name)
      if (cap) await user.type(dialog.getByLabelText('Reserve cap (optional, USD)'), cap)
      await user.click(dialog.getByRole('button', { name: 'Create account' }))

      const input = dialog.getByLabelText(field)
      expect(await dialog.findByText(message)).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveFocus()
      expect(accountRequests('create')).toEqual([])
    },
  )

  it('Cancel sends nothing and gives the focus back to New account', async () => {
    const { user, dialog } = await openNewAccount()

    await user.type(dialog.getByLabelText('Name'), 'ProviderC-New')
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'New account' })).toHaveFocus()
    expect(accountRequests('create')).toEqual([])
  })

  it('a double click on Create account sends one POST', async () => {
    const { user, dialog } = await openNewAccount()

    await user.type(dialog.getByLabelText('Name'), 'ProviderC-New')
    await user.dblClick(dialog.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(accountRequests('create')).toHaveLength(1)
  })
})

describe('New account: fees and matching rules', () => {
  it('copies the fees of ProviderC-USD and links Provider C legacy', async () => {
    const { user, dialog } = await openNewAccount()

    expect(optionsOf(await dialog.findByLabelText('Matching rules'))).toEqual([
      'None · global rules',
      'Provider C legacy',
    ])
    await user.type(dialog.getByLabelText('Name'), 'ProviderC-New')
    await user.selectOptions(dialog.getByLabelText('Fees'), 'ProviderC-USD')
    await user.selectOptions(dialog.getByLabelText('Matching rules'), 'Provider C legacy')
    await user.click(dialog.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(accountRequests('create')).toHaveLength(1))
    expect(accountRequests('create')[0]?.body).toMatchObject({
      copyFeesFromAccountId: ACCOUNT_IDS['ProviderC-USD'],
      matchingRuleSetId: RULE_SET_IDS.legacy,
    })
  })

  it('in Provider A: the global rules only, and its accounts to copy from, the closed ones marked', async () => {
    addClosedAccount()
    const { dialog } = await openNewAccount('merchantId=1&providerId=101')

    await waitFor(() =>
      expect(optionsOf(dialog.getByLabelText('Fees'))).toEqual([
        'No fees',
        'ProviderA-EUR',
        'ProviderA-Old (closed)',
        'ProviderA-USD',
      ]),
    )
    expect(optionsOf(dialog.getByLabelText('Matching rules'))).toEqual(['None · global rules'])
    expect(dialog.getByText(/copies only the active fees/i)).toBeInTheDocument()
  })

  it('changing the provider puts Fees and Matching rules back to their defaults', async () => {
    const { user, dialog } = await openNewAccount()
    await user.selectOptions(await dialog.findByLabelText('Fees'), 'ProviderC-USD')
    await user.selectOptions(await dialog.findByLabelText('Matching rules'), 'Provider C legacy')

    await user.selectOptions(dialog.getByLabelText('Merchant'), 'Merchant A')
    await user.selectOptions(await dialog.findByRole('combobox', { name: 'Provider' }), 'Provider A')

    await waitFor(() => expect(dialog.getByLabelText('Fees')).toHaveValue(''))
    expect(dialog.getByLabelText('Matching rules')).toHaveValue('')
  })
})

describe('Edit account', () => {
  it('changes policy and cap: only those fields, and the Overview shows them', async () => {
    const { user, sheet } = await openEdit(USD, 'ProviderA-USD')

    await user.selectOptions(sheet.getByLabelText('Reserve policy on chargeback'), 'release_on_chargeback')
    await user.type(sheet.getByLabelText('Reserve cap (optional, USD)'), '1000')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(accountRequests('patch')[0]?.body).toEqual({
      chargebackReservePolicy: 'release_on_chargeback',
      rollingReserveCapAmt: '1000',
    })
    expect(await generalValue('Reserve policy on chargeback')).toBe('release_on_chargeback')
    expect(await generalValue('Reserve cap')).toBe('1,000.0000')
  })

  it('the same cap with another scale is nothing to save', async () => {
    const { user, sheet } = await openEdit(EUR, 'ProviderA-EUR')

    await user.clear(sheet.getByLabelText('Reserve cap (optional, USD)'))
    await user.type(sheet.getByLabelText('Reserve cap (optional, USD)'), '50000')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(await sheet.findByText('Nothing to save.')).toBeInTheDocument()
    expect(accountRequests('patch')).toEqual([])
  })

  it('None · global rules unlinks the rule set', async () => {
    const { user, sheet } = await openEdit(ALT, 'ProviderC-Alt')

    await waitFor(() => expect(sheet.getByLabelText('Matching rules')).toHaveValue(String(RULE_SET_IDS.legacy)))
    await user.selectOptions(sheet.getByLabelText('Matching rules'), 'None · global rules')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(accountRequests('patch')).toHaveLength(1))
    expect(accountRequests('patch')[0]?.body).toEqual({ matchingRuleSetId: null })
    await waitFor(async () => expect(await generalValue('Matching rules')).toBe('None · global rules'))
  })

  it('an empty cap removes it', async () => {
    const { user, sheet } = await openEdit(EUR, 'ProviderA-EUR')

    await user.clear(sheet.getByLabelText('Reserve cap (optional, USD)'))
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(accountRequests('patch')).toHaveLength(1))
    expect(accountRequests('patch')[0]?.body).toEqual({ rollingReserveCapAmt: null })
    expect(await generalValue('Reserve cap')).toBe('none')
  })

  it('renames with a reason, and the title follows', async () => {
    const { user, sheet } = await openEdit(USD, 'ProviderA-USD')

    await user.clear(sheet.getByLabelText('Name'))
    await user.type(sheet.getByLabelText('Name'), 'ProviderA-USD2')
    await user.type(sheet.getByLabelText('Reason (optional)'), 'typo')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'ProviderA-USD2' })).toBeInTheDocument()
    expect(accountRequests('patch')[0]?.body).toEqual({ name: 'ProviderA-USD2', reason: 'typo' })
  })

  it('keeps the current rule set although it is inactive, so saving something else does not change it', async () => {
    const index = db.accounts.findIndex((a) => a.accountId === ALT)
    db.accounts[index] = { ...db.accounts[index]!, matchingRuleSetId: RULE_SET_IDS.retired }
    const { user, sheet } = await openEdit(ALT, 'ProviderC-Alt')

    await waitFor(() =>
      expect(optionsOf(sheet.getByLabelText('Matching rules'))).toEqual([
        'None · global rules',
        'Provider C legacy',
        'Provider C retired (inactive)',
      ]),
    )
    expect(sheet.getByLabelText('Matching rules')).toHaveValue(String(RULE_SET_IDS.retired))
    await user.selectOptions(sheet.getByLabelText('Reserve policy on chargeback'), 'release_on_chargeback')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(accountRequests('patch')).toHaveLength(1))
    expect(accountRequests('patch')[0]?.body).toEqual({ chargebackReservePolicy: 'release_on_chargeback' })
  })
})

describe('Close… and Reopen…', () => {
  it('closes with a reason: closed, Reopen…, and no New reconciliation', async () => {
    const { user } = await openDetail(USD, 'ProviderA-USD')

    await user.click(header().getByRole('button', { name: 'Close…' }))
    const dialog = within(await screen.findByRole('alertdialog', { name: 'Close ProviderA-USD?' }))
    expect(dialog.getByText(/no new imports/i)).toBeInTheDocument()
    await user.type(dialog.getByLabelText('Reason (optional)'), 'provider stopped')
    await user.click(dialog.getByRole('button', { name: 'Close account' }))

    await waitFor(() => expect(header().getByText('closed')).toBeInTheDocument())
    expect(accountRequests('patch')[0]?.body).toEqual({ isActive: false, reason: 'provider stopped' })
    expect(header().getByRole('button', { name: 'Reopen…' })).toBeInTheDocument()
    expect(header().queryByRole('link', { name: 'New reconciliation' })).not.toBeInTheDocument()
  })

  it('reopens without a reason', async () => {
    addClosedAccount()
    const { user } = await openDetail(OLD, 'ProviderA-Old')

    await user.click(header().getByRole('button', { name: 'Reopen…' }))
    const dialog = within(await screen.findByRole('alertdialog', { name: 'Reopen ProviderA-Old?' }))
    await user.click(dialog.getByRole('button', { name: 'Reopen account' }))

    await waitFor(() => expect(header().getByText('active')).toBeInTheDocument())
    expect(accountRequests('patch')[0]?.body).toEqual({ isActive: true })
  })

  it('Cancel sends nothing and gives the focus back to the action', async () => {
    const { user } = await openDetail(USD, 'ProviderA-USD')

    await user.click(header().getByRole('button', { name: 'Close…' }))
    const dialog = within(await screen.findByRole('alertdialog', { name: 'Close ProviderA-USD?' }))
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(header().getByRole('button', { name: 'Close…' })).toHaveFocus()
    expect(accountRequests('patch')).toEqual([])
  })

  it('stays open while the request is on its way, and says why it failed', async () => {
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.patch(`*/api/v1/accounts/${USD}`, async () => {
        await gate
        return HttpResponse.json({ code: 'internal_error', message: 'boom' }, { status: 500 })
      }),
    )
    const { user } = await openDetail(USD, 'ProviderA-USD')

    await user.click(header().getByRole('button', { name: 'Close…' }))
    const dialog = within(await screen.findByRole('alertdialog', { name: 'Close ProviderA-USD?' }))
    await user.click(dialog.getByRole('button', { name: 'Close account' }))
    expect(await dialog.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    release()
    expect(await dialog.findByText('Could not reach the server. Try again.')).toBeInTheDocument()
  })
})

describe('Account forms: errors of the API', () => {
  it('a taken name goes next to Name, with what was written kept and the focus there', async () => {
    respondNextAccount('create', { status: 409, code: 'account_name_taken' })
    const { user, dialog } = await openNewAccount()

    await user.type(dialog.getByLabelText('Name'), 'ProviderA-USD')
    await user.type(dialog.getByLabelText('Reserve cap (optional, USD)'), '100')
    await user.click(dialog.getByRole('button', { name: 'Create account' }))

    expect(
      await dialog.findByText('This name is already used by another account. Name must be unique.'),
    ).toBeInTheDocument()
    expect(dialog.getByLabelText('Name')).toHaveValue('ProviderA-USD')
    expect(dialog.getByLabelText('Name')).toHaveFocus()
    expect(dialog.getByLabelText('Reserve cap (optional, USD)')).toHaveValue('100')
  })

  it('a rule set no longer valid goes next to Matching rules in Edit', async () => {
    respondNextAccount('patch', {
      status: 400,
      code: 'validation_error',
      details: { field: 'matchingRuleSetId' },
    })
    const { user, sheet } = await openEdit(ALT, 'ProviderC-Alt')

    await user.selectOptions(sheet.getByLabelText('Reserve policy on chargeback'), 'release_on_chargeback')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(await sheet.findByText('This rule set is no longer available for this provider.')).toBeInTheDocument()
    expect(sheet.getByLabelText('Matching rules')).toHaveAttribute('aria-invalid', 'true')
    expect(sheet.getByLabelText('Reserve policy on chargeback')).toHaveValue('release_on_chargeback')
  })

  it('a fee source that is not valid goes next to Fees', async () => {
    respondNextAccount('create', {
      status: 400,
      code: 'validation_error',
      details: { field: 'copyFeesFromAccountId' },
    })
    const { user, dialog } = await openNewAccount()

    await user.type(dialog.getByLabelText('Name'), 'ProviderC-New')
    await user.selectOptions(await dialog.findByLabelText('Fees'), 'ProviderC-USD')
    await user.click(dialog.getByRole('button', { name: 'Create account' }))

    expect(await dialog.findByText('Fees cannot be copied from this account.')).toBeInTheDocument()
    expect(dialog.getByLabelText('Fees')).toHaveValue(ACCOUNT_IDS['ProviderC-USD'])
  })

  it('403 says the permission is missing and keeps what was written', async () => {
    respondNextAccount('patch', { status: 403, code: 'forbidden' })
    const { user, sheet } = await openEdit(USD, 'ProviderA-USD')

    await user.type(sheet.getByLabelText('Reserve cap (optional, USD)'), '1000')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(await sheet.findByRole('alert')).toHaveTextContent("You don't have permission to manage accounts.")
    expect(sheet.getByLabelText('Reserve cap (optional, USD)')).toHaveValue('1000')
  })

  it('a network error asks to try again and keeps what was written', async () => {
    server.use(http.patch(`*/api/v1/accounts/${USD}`, () => HttpResponse.error()))
    const { user, sheet } = await openEdit(USD, 'ProviderA-USD')

    await user.type(sheet.getByLabelText('Reserve cap (optional, USD)'), '1000')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(await sheet.findByRole('alert')).toHaveTextContent('Could not reach the server. Try again.')
    expect(sheet.getByLabelText('Reserve cap (optional, USD)')).toHaveValue('1000')
  })
})
