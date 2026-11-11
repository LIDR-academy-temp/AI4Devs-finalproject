import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import { importRequests } from '@/test/msw/imports'
import {
  accountSettlement,
  paidHistory,
  seedAccountSettlements,
  seedMovements,
  seedSettlement,
  settlementMovement,
  settlementRequests,
} from '@/test/msw/settlements'
import { validationRequests } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { validatedImport } from '@/test/settlement-screens'
import { OPENING } from '@/test/validation-screens'
import { strings } from './strings'

const USD = ACCOUNT_IDS['ProviderA-USD']

describe('Settlement Summary: read only (spec "solo lectura")', () => {
  it('viewer sees the whole attempt, the downloads its permission allows, and no action that writes', async () => {
    const { importId } = validatedImport()
    const { batchId } = seedSettlement(importId, { batchNo: 123 })
    renderApp(`/settlements/${batchId}`, { as: 'viewer' })

    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' }, OPENING)).toBeInTheDocument()
    expect(screen.getByText('Processed · pending payment')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Totals by type' })).toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: 'Amount payable' })).getAllByRole('row')).toHaveLength(10)
    expect(screen.getByRole('list', { name: 'Batch fees' })).toBeInTheDocument()
    for (const name of ['Merchant summary', 'Transactions (CSV)', 'Reserves (CSV)']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }

    expect(screen.queryByRole('button', { name: /pay|undo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New reconciliation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Settlement Review' })).not.toBeInTheDocument()
    const writes = [...settlementRequests(), ...importRequests(), ...validationRequests()].filter(
      (r) => r.method !== 'GET',
    )
    expect(writes).toHaveLength(0)
  })

  it('viewer walks the list of ProviderA-USD, batch 122 and its Movements as analyst does, with GET requests only', async () => {
    const { importId } = validatedImport()
    const view = seedSettlement(importId, { batchNo: 122, overrides: { status: 'paid', settledStatus: 'settled' } })
    seedAccountSettlements(USD, [
      accountSettlement({ batchId: view.batchId, importId, batchNo: 122 }),
      ...paidHistory(USD, 21, 121),
    ])
    seedMovements(view.batchId, 'E', [settlementMovement({ settled: true })])

    const rowsAs = async (as: 'analyst' | 'viewer') => {
      const rendered = renderApp(`/settlements?accountId=${USD}`, { as })
      const table = await screen.findByRole('table', { name: strings.list.tableLabel }, OPENING)
      const rows = within(table)
        .getAllByRole('row')
        .map((r) => r.textContent)
      return { rendered, rows }
    }
    const analyst = await rowsAs('analyst')
    analyst.rendered.unmount()
    const { rendered, rows } = await rowsAs('viewer')
    expect(rows).toEqual(analyst.rows)
    expect(screen.queryByRole('button', { name: /pay|undo|export/i })).not.toBeInTheDocument()

    await rendered.user.click(screen.getByRole('link', { name: strings.list.batchLink(122, 1) }))
    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 122' })).toBeInTheDocument()
    await rendered.user.click(screen.getByRole('tab', { name: strings.summary.tabs.movements }))
    const movements = await screen.findByRole('table', { name: strings.movements.tableLabel })
    const [, movement] = within(movements).getAllByRole('row')
    expect(within(movement!).getByText(strings.movements.settled)).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /pay|undo/i })).not.toBeInTheDocument()
    const writes = [...settlementRequests(), ...importRequests(), ...validationRequests()].filter(
      (r) => r.method !== 'GET',
    )
    expect(writes).toHaveLength(0)
  })

  it('analyst may start a new reconciliation from it', async () => {
    const { importId } = validatedImport()
    const { batchId } = seedSettlement(importId, { batchNo: 123 })
    renderApp(`/settlements/${batchId}`, { as: 'analyst' })

    expect(await screen.findByRole('link', { name: 'New reconciliation' }, OPENING)).toHaveAttribute(
      'href',
      '/reconciliations/new',
    )
  })
})
