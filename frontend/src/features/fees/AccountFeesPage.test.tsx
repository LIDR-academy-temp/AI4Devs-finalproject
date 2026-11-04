import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { feeFixture, feeRequests, seedAccountFees } from '@/test/msw/fees'
import { ACCOUNT_IDS, type UserName } from '@/test/msw/fixtures'
import { issueTokens } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'
import { strings } from './strings'

// Spec fees "Pantalla Account Fees: acceso y contenido", "acciones según permiso y uso" and "historial"
// (web-admin-fees design D2, D9). The rows come from the fake; the screen decides only what it offers by permission
// and by the inUse / status / endDate the API sends.
const s = strings.account
const USD = ACCOUNT_IDS['ProviderA-USD']

async function openAccount(as: UserName, accountId: string = USD) {
  const rendered = renderApp(`/accounts/${accountId}/fees`, { as })
  await screen.findByRole('table', { name: s.tableLabel }, OPENING)
  return rendered
}

const table = () => screen.getByRole('table', { name: s.tableLabel })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)

/** The row of a fee by its type and its Valid from, as shown. */
function rowOf(title: string, validFrom: string) {
  const row = bodyRows().find((r) => {
    const cells = within(r).getAllByRole('cell')
    return cells[0]?.textContent === title && cells[3]?.textContent === validFrom
  })
  if (!row) throw new Error(`No row ${title} from ${validFrom}`)
  return within(row)
}

const actionsOf = (row: ReturnType<typeof rowOf>) => row.queryAllByRole('button').map((b) => b.textContent)

/** Calls the fake API as a user, as another session would (to prepare history). */
async function call(as: UserName, method: string, path: string, body?: object) {
  const { accessToken } = issueTokens(as)
  const response = await fetch(`${window.location.origin}/api/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return response.json()
}

describe('Account fees: access and content', () => {
  it('shows the account, its merchant and provider, and every fee: active, scheduled and closed', async () => {
    await openAccount('viewer')

    expect(screen.getByRole('heading', { level: 1, name: 'Fees · ProviderA-USD' })).toBeInTheDocument()
    expect(screen.getByText('Merchant A › Provider A')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: s.seeAll })).toHaveAttribute(
      'href',
      `/fees?merchantId=1&providerId=101&accountId=${USD}&status=all`,
    )
    expect(bodyRows().map((r) => within(r).getAllByRole('cell')[5]?.textContent)).toEqual(
      expect.arrayContaining(['Active', 'Scheduled', 'Closed']),
    )
    expect(feeRequests('accountFees').at(-1)!.url).toBe(`/api/v1/accounts/${USD}/fees`)
  })

  it('shows the columns, the use and the values as text', async () => {
    await openAccount('viewer')

    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Type', 'Applies to', 'Value', 'Valid from', 'Valid to', 'Status', 'Use', 'Actions'])
    const mdr = rowOf('MDR', '2026-01-01')
    expect(
      mdr
        .getAllByRole('cell')
        .slice(0, 7)
        .map((c) => c.textContent),
    ).toEqual(['MDR', 'E · Successful', '2.900 %', '2026-01-01', 'open', 'Active', 'In use'])
    expect(rowOf('Refund per txn fee', '2027-01-01').getAllByRole('cell')[6]?.textContent).toBe('')
  })

  it('a closed fee shows Closed and its end, and offers no Close…', async () => {
    await openAccount('admin')

    const closed = rowOf('MDR', 'always')
    expect(closed.getByText('Closed')).toBeInTheDocument()
    expect(closed.getByText('2025-12-31')).toBeInTheDocument()
    expect(actionsOf(closed)).not.toContain('Close…')
  })

  it.each([
    ['of another merchant', ACCOUNT_IDS['ProviderC-Alt']],
    ['that does not exist', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
  ])('an account %s is not available, with the same message', async (_case, accountId) => {
    renderApp(`/accounts/${accountId}/fees`, { as: 'viewer' })

    expect(await screen.findByText(s.notAvailable, undefined, OPENING)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: s.tableLabel })).not.toBeInTheDocument()
  })
})

describe('Account fees: actions by permission and use', () => {
  it('analyst (fee.view only) sees History in each row and no action that changes a fee', async () => {
    await openAccount('analyst')

    expect(screen.queryByRole('button', { name: s.add })).not.toBeInTheDocument()
    for (const row of bodyRows())
      expect(
        within(row)
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['History'])
  })

  it('admin: a fee without use offers Edit, Close… and History, not Change from date…', async () => {
    await openAccount('admin')

    expect(screen.getByRole('button', { name: s.add })).toBeInTheDocument()
    expect(actionsOf(rowOf('Refund per txn fee', '2027-01-01'))).toEqual(['Edit', 'Close…', 'History'])
  })

  it('admin: a fee in use offers Edit, Change from date…, Close… and History', async () => {
    await openAccount('admin')

    expect(actionsOf(rowOf('MDR', '2026-01-01'))).toEqual(['Edit', 'Change from date…', 'Close…', 'History'])
  })

  it('each action names its fee for a screen reader: the type and its Valid from, the visible text first', async () => {
    await openAccount('admin')

    const names = (row: ReturnType<typeof rowOf>) => row.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(names(rowOf('MDR', '2026-01-01'))).toEqual([
      'Edit MDR from 2026-01-01',
      'Change from date: MDR from 2026-01-01',
      'Close MDR from 2026-01-01',
      'History of MDR from 2026-01-01',
    ])
    expect(names(rowOf('Chargeback per txn fee', 'always'))).toContain('Edit Chargeback per txn fee, always')
  })

  it('there is no action to withdraw or delete a fee, not even a scheduled one without use', async () => {
    await openAccount('admin')

    for (const name of [/withdraw/i, /delete/i, /remove/i]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })
})

describe('Account fees: history', () => {
  it('shows the chain of the type after a change from a date, newest first', async () => {
    const original = feeFixture({ feeTypeId: 1, percentage: '0.100000' })
    seedAccountFees('ProviderA-USD', [original])
    const changed = await call('admin', 'PATCH', `/fees/${original.feeId}`, {
      effectiveFrom: '2026-11-01',
      percentage: '0.095',
    })
    const { user } = await openAccount('analyst')

    await user.click(rowOf('MDR', '2026-11-01').getByRole('button', { name: 'History of MDR from 2026-11-01' }))

    const panel = within(await screen.findByRole('dialog', { name: 'History · MDR' }))
    const entries = await panel.findAllByRole('listitem')
    expect(entries.map((e) => within(e).getByRole('heading').textContent)).toEqual(['Created', 'Closed', 'Created'])
    expect(entries[1]).toHaveTextContent('Valid to: open → 2026-10-31')
    expect(entries[1]).toHaveTextContent('admin')
    expect(entries[1]).toHaveTextContent(/2026-11-03 \d\d:\d\d ET/)
    expect(entries[2]).toHaveTextContent('seed')
    expect(feeRequests('history').at(-1)!.url).toBe(`/api/v1/fees/${changed.successor.feeId}/history?scope=type`)
  })

  it('a correction shows its reason and what changed', async () => {
    const fee = feeFixture({ feeTypeId: 1, percentage: '0.025000', inUse: false, lastAppliedEventDate: null })
    seedAccountFees('ProviderA-USD', [fee])
    await call('admin', 'PATCH', `/fees/${fee.feeId}`, { percentage: '0.0275', reason: 'typo' })
    const { user } = await openAccount('viewer')

    await user.click(rowOf('MDR', 'always').getByRole('button', { name: 'History of MDR, always' }))

    const panel = within(await screen.findByRole('dialog', { name: 'History · MDR' }))
    const [updated] = await panel.findAllByRole('listitem')
    expect(within(updated!).getByRole('heading')).toHaveTextContent('Updated')
    expect(updated).toHaveTextContent('typo')
    expect(updated).toHaveTextContent('Percentage: 2.500 % → 2.750 %')
  })

  it('Escape closes the panel and gives the focus back to its History button', async () => {
    const { user } = await openAccount('viewer')
    const history = rowOf('MDR', '2026-01-01').getByRole('button', { name: 'History of MDR from 2026-01-01' })

    await user.click(history)
    await screen.findByRole('dialog', { name: 'History · MDR' })
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(history).toHaveFocus()
  })
})
