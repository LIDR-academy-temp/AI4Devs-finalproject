import { screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { tableRows, writeActions } from '@/test/matching-screens'
import { ACCOUNT_IDS, type UserName } from '@/test/msw/fixtures'
import { db } from '@/test/msw/handlers'
import { withScopedAdmin } from '@/test/msw/matching'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Spec matching "Pantalla Matching Rules: detalle de un conjunto", "filas a ignorar de solo lectura" and "permisos
// de la pantalla" (web-admin-matching design D3, D8). The statuses are named from the catalog of the global rules.
const LEGACY = '/matching-rules/3'

async function openLegacy(as: UserName) {
  const rendered = renderApp(LEGACY, { as })
  await screen.findByRole('heading', { level: 1, name: 'Provider C legacy' }, OPENING)
  return rendered
}

describe('Matching Rules: detail of a rule set', () => {
  it('shows the legacy set: provider, linked accounts, sheet and column rules in the order of the API', async () => {
    await openLegacy('analyst')

    const header = within(screen.getByRole('region', { name: 'Rule set' }))
    expect(header.getByText('active')).toBeInTheDocument()
    expect(header.getByText('Provider C')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ProviderC-Alt' })).toHaveAttribute(
      'href',
      `/accounts/${ACCOUNT_IDS['ProviderC-Alt']}`,
    )
    expect(await tableRows('Sheet rules')).toEqual([
      ['TRX', 'no', 'transactions', 'E', '—', '10', 'yes'],
      ['CB', 'no', 'transactions', 'I', '—', '10', 'yes'],
      ['Fail', 'no', 'transactions', 'E', 'Declined', '10', 'yes'],
      ['Summary', 'no', 'ignore', '—', '—', '10', 'yes'],
    ])
    expect(await tableRows('Column rules')).toEqual([
      ['Any sheet', 'Merchant Order No#', 'no', 'transactionId', '5', 'yes'],
      ['Any sheet', 'Order Status', 'no', 'status', '5', 'yes'],
      ['Any sheet', 'Amount USD', 'no', 'amount', '5', 'yes'],
    ])
  })

  it('shows the rows to ignore read-only, with the note of #120', async () => {
    await openLegacy('admin')
    const rows = within(screen.getByRole('region', { name: 'Rows to ignore' }))
    expect(rows.getByText('No rows to ignore.')).toBeInTheDocument()
    expect(rows.getByText('Not applied yet (#120).')).toBeInTheDocument()
    expect(rows.queryByRole('button')).not.toBeInTheDocument()
  })

  it('a closed linked account is marked closed', async () => {
    // The fake reads the accounts of the catalog, so closing ProviderC-Alt there is enough.
    const index = db.accounts.findIndex((a) => a.accountId === ACCOUNT_IDS['ProviderC-Alt'])
    db.accounts[index] = { ...db.accounts[index]!, isActive: false }

    await openLegacy('analyst')
    const accounts = within(screen.getByRole('region', { name: 'Linked accounts' }))
    expect(accounts.getByRole('link', { name: 'ProviderC-Alt' })).toBeInTheDocument()
    expect(accounts.getByText('closed')).toBeInTheDocument()
  })

  it.each([
    ['viewer', LEGACY],
    ['admin', '/matching-rules/999999'],
    ['admin', '/matching-rules/abc'],
  ] as const)('%s in %s sees that the rule set is not available, and no rule', async (as, path) => {
    renderApp(path, { as })
    expect(await screen.findByText('This rule set is not available.', {}, OPENING)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Sheet rules' })).not.toBeInTheDocument()
  })

  it('without the catalog of statuses, a fixed status is shown by its id and the screen is not blocked', async () => {
    server.use(http.get('*/api/v1/matching-rules/global', () => HttpResponse.json({}, { status: 500 })))
    await openLegacy('analyst')

    expect((await tableRows('Sheet rules'))[2]).toEqual(['Fail', 'no', 'transactions', 'E', 'Status 3', '10', 'yes'])
  })

  it('a failed read offers Retry, which reads the rule set again', async () => {
    server.use(
      http.get('*/api/v1/matching-rule-sets/:ruleSetId', () => HttpResponse.json({}, { status: 500 }), { once: true }),
    )
    const { user } = renderApp(LEGACY, { as: 'analyst' })

    expect(await screen.findByText('Could not load the rule set.', {}, OPENING)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Provider C legacy' })).toBeInTheDocument()
    expect(await tableRows('Sheet rules')).toHaveLength(4)
  })
})

describe('Matching Rules: permissions of a rule set', () => {
  it('analyst reads the rule set without any write action', async () => {
    await openLegacy('analyst')
    await tableRows('Sheet rules')
    expect(writeActions()).toEqual([])
  })

  it('admin sees Edit rules, Rename… and Deactivate… on an active set', async () => {
    await openLegacy('admin')
    await tableRows('Sheet rules')
    expect(writeActions()).toEqual(['Edit rules', 'Rename…', 'Deactivate…'])
  })

  it('admin sees Activate… on an inactive set', async () => {
    renderApp('/matching-rules/4', { as: 'admin' })
    await screen.findByRole('heading', { level: 1, name: 'Provider C retired' }, OPENING)
    expect(writeActions()).toEqual(['Edit rules', 'Rename…', 'Activate…'])
  })

  it('an admin whose scope is assigned still edits the rule sets of its merchants', async () => {
    withScopedAdmin()
    await openLegacy('admin')
    await tableRows('Sheet rules')
    expect(writeActions()).toEqual(['Edit rules', 'Rename…', 'Deactivate…'])
  })
})
