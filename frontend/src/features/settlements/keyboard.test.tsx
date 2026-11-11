import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { strings as accountStrings } from '@/features/accounts/strings'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import {
  accountSettlement,
  paidHistory,
  seedAccountSettlements,
  seedMovements,
  seedSettlement,
  settlementMovement,
  settlementRequests,
} from '@/test/msw/settlements'
import { renderApp } from '@/test/render'
import {
  batchNoField,
  chooseDate,
  dateField,
  openReview,
  previewShown,
  processButton,
  validatedImport,
} from '@/test/settlement-screens'
import { OPENING } from '@/test/validation-screens'
import { strings } from './strings'

/** Presses Tab until `target` has the focus; fails if it is not reachable from the keyboard. */
async function tabTo(user: UserEvent, target: HTMLElement, limit = 60) {
  for (let i = 0; i < limit && document.activeElement !== target; i++) await user.tab()
  expect(target).toHaveFocus()
}

/** Every disabled control of the page says why, in a visible text linked by aria-describedby. */
function expectEveryDisabledControlExplained() {
  const disabled = [...document.querySelectorAll<HTMLElement>('button:disabled, select:disabled')]
  expect(disabled.length).toBeGreaterThan(0)
  for (const control of disabled) {
    const ids = control.getAttribute('aria-describedby')?.split(' ') ?? []
    const texts = ids.map((id) => document.getElementById(id)?.textContent?.trim() ?? '').filter(Boolean)
    expect(texts, control.textContent || control.getAttribute('aria-label') || '').not.toHaveLength(0)
    for (const id of ids) expect(document.getElementById(id)).toBeVisible()
  }
}

const amountOf = (title: string) => screen.getByRole('textbox', { name: `Amount — ${title}` })

describe('Settlement Review: keyboard and reasons (spec "teclado y motivos")', () => {
  it('the batch number, a preset and a free amount, removing a fee, the channel box and Process, with the keyboard only', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)
    expectEveryDisabledControlExplained()

    await tabTo(user, batchNoField())
    await user.keyboard('{Control>}a{/Control}{Backspace}124')
    expect(batchNoField()).toHaveValue('124')
    // The date picker is the browser's own control: reached with Tab, its value is set as the picker would set it.
    await tabTo(user, dateField())
    chooseDate('2026-10-24')

    const addPreset = screen.getByRole('combobox', { name: 'Add preset fee' })
    await waitFor(() => expect(addPreset).toBeEnabled())
    await tabTo(user, addPreset)
    await user.selectOptions(addPreset, within(addPreset).getByRole('option', { name: /^Chargeback over 1%/ }))
    expect(amountOf('Chargeback over 1%')).toHaveFocus()
    await user.keyboard('12.5000')

    const addFree = screen.getByRole('combobox', { name: 'Add free-amount fee' })
    await tabTo(user, addFree)
    await user.selectOptions(addFree, within(addFree).getByRole('option', { name: 'Special Adjustment' }))
    expect(amountOf('Special Adjustment')).toHaveFocus()
    await user.keyboard('-1.0000')
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Description — Special Adjustment' })).toHaveFocus()
    await user.keyboard('Wrong row')

    await tabTo(user, screen.getByRole('button', { name: 'Remove Special Adjustment' }))
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('listitem', { name: 'Special Adjustment' })).not.toBeInTheDocument()
    expect(addFree).toHaveFocus()

    await previewShown()
    const box = screen.getByRole('checkbox', { name: 'Assign these channels to this account as primary' })
    await tabTo(user, box)
    await user.keyboard(' ')
    expect(box).toBeChecked()

    await tabTo(user, processButton())
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 124' })).toBeInTheDocument()
    expect(settlementRequests('process')).toHaveLength(1)
  })
})

describe('Settlement List and Movements: keyboard and reasons (spec "teclado y motivos", settlements-browse)', () => {
  it('viewer chooses the account and the filters, pages, opens a batch, its Movements, a cycle and a breakdown', async () => {
    const USD = ACCOUNT_IDS['ProviderA-USD']
    const { importId } = validatedImport()
    const view = seedSettlement(importId, { batchNo: 122, overrides: { status: 'paid', settledStatus: 'settled' } })
    seedAccountSettlements(USD, [
      accountSettlement({ batchId: view.batchId, importId, batchNo: 122 }),
      ...paidHistory(USD, 21, 121),
    ])
    seedMovements(view.batchId, 'I', [settlementMovement({ cycle: 'I', status: 'Refund', roundNo: 1 })])
    const { user, router } = renderApp('/settlements', { as: 'viewer' })
    const list = strings.list

    const provider = await screen.findByLabelText(accountStrings.picker.provider)
    await waitFor(() => expect(provider).toBeEnabled())
    await tabTo(user, provider)
    await user.selectOptions(provider, 'Provider A')
    const account = screen.getByLabelText(accountStrings.picker.account)
    await waitFor(() => expect(account).toBeEnabled())
    await tabTo(user, account)
    await user.selectOptions(account, 'ProviderA-USD')
    await screen.findByRole('table', { name: list.tableLabel }, OPENING)

    await tabTo(user, screen.getByLabelText(list.status))
    await user.selectOptions(screen.getByLabelText(list.status), list.statuses.paid)
    await tabTo(user, screen.getByLabelText(list.dateField))
    await user.selectOptions(screen.getByLabelText(list.dateField), list.dateFields.processedAt)
    // The date inputs are the browser's own controls: reached with Tab, set as the picker would set them.
    await tabTo(user, screen.getByLabelText(list.from))
    fireEvent.change(screen.getByLabelText(list.from), { target: { value: '2026-01-01' } })
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        status: 'paid',
        dateField: 'processedAt',
        from: '2026-01-01',
      }),
    )

    await waitFor(() => expect(screen.getByText(list.pageOf(1, 2, 22))).toBeInTheDocument())
    expectEveryDisabledControlExplained()
    await tabTo(user, screen.getByRole('button', { name: list.next }))
    await user.keyboard('{Enter}')
    expect(await screen.findByText(list.pageOf(2, 2, 22))).toBeInTheDocument()
    expectEveryDisabledControlExplained()
    await tabTo(user, screen.getByRole('button', { name: list.previous }))
    await user.keyboard('{Enter}')
    await screen.findByText(list.pageOf(1, 2, 22))

    await tabTo(user, await screen.findByRole('link', { name: list.batchLink(122, 1) }))
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 122' })).toBeInTheDocument()

    await tabTo(user, screen.getByRole('tab', { name: strings.summary.tabs.summary }))
    await user.keyboard('{ArrowRight}')
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: strings.summary.tabs.movements })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )
    const cycleI = await screen.findByRole('button', { name: 'I (10)' })
    await tabTo(user, cycleI)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(cycleI).toHaveAttribute('aria-pressed', 'true'))

    const breakdown = await screen.findByRole('button', { name: strings.movements.feeCount(2) })
    expect(screen.getByText('MDR · 11.5240')).not.toBeVisible()
    await tabTo(user, breakdown)
    await user.keyboard('{Enter}')
    expect(breakdown).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('MDR · 11.5240')).toBeVisible()
  })
})

describe('Settlement Summary: keyboard and reasons (spec "teclado y motivos")', () => {
  it('the three downloads and the links are reachable with Tab', async () => {
    const { importId } = validatedImport()
    const { batchId } = seedSettlement(importId, { batchNo: 123 })
    const { user } = renderApp(`/settlements/${batchId}`, { as: 'analyst' })
    await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' }, OPENING)

    for (const name of ['Merchant summary', 'Transactions (CSV)', 'Reserves (CSV)']) {
      await tabTo(user, screen.getByRole('button', { name }))
    }
    await tabTo(user, screen.getByRole('link', { name: 'View the validations' }))
    await tabTo(user, screen.getByRole('link', { name: 'Back to Dashboard' }))
  })
})
