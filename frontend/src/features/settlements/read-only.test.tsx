import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { importRequests } from '@/test/msw/imports'
import { seedSettlement, settlementRequests } from '@/test/msw/settlements'
import { validationRequests } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { validatedImport } from '@/test/settlement-screens'
import { OPENING } from '@/test/validation-screens'

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
