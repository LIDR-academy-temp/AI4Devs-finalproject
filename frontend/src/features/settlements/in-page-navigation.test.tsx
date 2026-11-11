import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import {
  paidHistory,
  seedAccountSettlements,
  seedMovements,
  seedSettlement,
  settlementMovement,
  settlementRequests,
} from '@/test/msw/settlements'
import { renderApp } from '@/test/render'
import { focusOnAListHeading, watchScroll } from '@/test/scroll'
import { validatedImport } from '@/test/settlement-screens'
import { OPENING } from '@/test/validation-screens'
import { strings } from './strings'

// Spec web-shell "Navegación dentro de la página: desplazamiento y foco" in Settlement List and the Summary
// (design D13). A drop-down keeps the focus; Previous / Next and the cycle take it to the list.
const USD = ACCOUNT_IDS['ProviderA-USD']
const s = strings.list

// In the page, not in the menu: the menu has a Settlements group title too.
const heading = (name: string) => within(screen.getByRole('main')).getByRole('heading', { name })

async function openList(search = '') {
  seedAccountSettlements(USD, paidHistory(USD, 22))
  const scroll = watchScroll()
  const view = renderApp(`/settlements?accountId=${USD}${search}`, { as: 'analyst' })
  await screen.findByRole('table', { name: s.tableLabel }, OPENING)
  scroll.reset()
  return { ...view, scroll }
}

async function openSummary(search = '') {
  const { importId } = validatedImport()
  const view = seedSettlement(importId, { batchNo: 123 })
  const movements = (offset: number) =>
    Array.from({ length: 60 }, (_, i) => settlementMovement({ settlementTxnId: String(offset + i), rowNo: i + 2 }))
  seedMovements(view.batchId, 'E', movements(80_000))
  seedMovements(view.batchId, 'I', movements(81_000))
  const scroll = watchScroll()
  const rendered = renderApp(`/settlements/${view.batchId}${search}`, { as: 'analyst' })
  await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' }, OPENING)
  scroll.reset()
  return { ...rendered, scroll }
}

describe('in-page navigation in Settlement List', () => {
  it('a status chosen with the keyboard keeps the focus on the drop-down; Next takes it to the list', async () => {
    const { user, scroll } = await openList()
    const status = screen.getByLabelText(s.status)
    status.focus()

    await user.selectOptions(status, s.statuses.paid)
    await waitFor(() => expect(settlementRequests('accountSettlements').at(-1)!.url).toContain('status=paid'))
    expect(document.activeElement).toBe(status)
    expect(scroll.wentToTop()).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(document.activeElement).toBe(heading('Settlements')))
    expect(scroll.scrolledIntoView(heading('Settlements'))).toBe(true)
    expect(scroll.wentToTop()).toBe(false)
  })

  it('a page past the last one goes to the last one without taking the focus', async () => {
    const { router } = await openList('&page=5')

    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 2 }))
    expect(focusOnAListHeading()).toBe(false)
  })
})

describe('in-page navigation in the Settlement Summary', () => {
  it('the Movements tab keeps the focus on it; a cycle and Next take it to the movements', async () => {
    const { user, scroll } = await openSummary()

    const tab = screen.getByRole('tab', { name: strings.summary.tabs.movements })
    await user.click(tab)
    await screen.findByRole('table', { name: strings.movements.tableLabel })
    expect(document.activeElement).toBe(tab)
    expect(scroll.wentToTop()).toBe(false)

    await user.click(screen.getByRole('button', { name: /^I \(/ }))
    await waitFor(() => expect(document.activeElement).toBe(heading('Movements · I')))
    expect(scroll.scrolledIntoView(heading('Movements · I'))).toBe(true)

    scroll.reset()
    const movements = within(screen.getByRole('table', { name: strings.movements.tableLabel }).closest('section')!)
    await user.click(movements.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(document.activeElement).toBe(heading('Movements · I')))
    expect(scroll.scrolledIntoView(heading('Movements · I'))).toBe(true)
    expect(scroll.wentToTop()).toBe(false)
  })

  it('a reload on Movements keeps the tab, the cycle and the page without taking the focus', async () => {
    await openSummary('?tab=movements&cycle=R&page=2')

    await screen.findByRole('table', { name: strings.movements.tableLabel })
    expect(heading('Movements · R')).toBeInTheDocument()
    expect(focusOnAListHeading()).toBe(false)
  })
})
