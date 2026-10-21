import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import { accountSettlement, seedAccountSettlements, seedSettlement } from '@/test/msw/settlements'
import { renderApp } from '@/test/render'
import { validatedImport } from '@/test/settlement-screens'
import { OPENING } from '@/test/validation-screens'
import type { SettlementView } from './contract'
import { strings } from './strings'

// Spec web-shell "Colores de estado", scenario "Estados del intento" (design D8).
const USD = ACCOUNT_IDS['ProviderA-USD']

async function summaryHeader(settledStatus: SettlementView['settledStatus']) {
  const { importId } = validatedImport()
  const view = seedSettlement(importId, { batchNo: 123, overrides: { settledStatus } })
  renderApp(`/settlements/${view.batchId}`, { as: 'analyst' })
  await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' }, OPENING)
  return within(screen.getByRole('region', { name: 'Settlement Summary · batch 123' }))
}

describe('status colours of the attempt', () => {
  it.each([
    ['pending_payment', 'Processed · pending payment', 'warning'],
    ['settled', 'Paid', 'success'],
    ['undone', 'Undone', 'neutral'],
  ] as const)('Summary: %s reads %s with the %s tone', async (settledStatus, text, tone) => {
    expect((await summaryHeader(settledStatus)).getByText(text)).toHaveAttribute('data-variant', tone)
  })

  it('Settlement List: each attempt with the tone of its status and its text', async () => {
    seedAccountSettlements(USD, [
      accountSettlement({ batchNo: 124, status: 'processed', settledStatus: 'pending_payment' }),
      accountSettlement({ batchNo: 123 }),
      accountSettlement({ batchNo: 118, status: 'undone', settledStatus: 'undone' }),
    ])
    renderApp(`/settlements?accountId=${USD}`, { as: 'analyst' })
    const table = await screen.findByRole('table', { name: strings.list.tableLabel }, OPENING)

    const badges = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[2]!.firstElementChild!)
    expect(badges.map((b) => [b.getAttribute('data-variant'), b.textContent])).toEqual([
      ['warning', 'Processed · pending payment'],
      ['success', 'Paid'],
      ['neutral', 'Undone'],
    ])
  })
})
