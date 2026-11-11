import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { businessDate } from '@/lib/format'
import { importRecord } from '@/test/msw/imports'
import { recordRequests } from '@/test/msw/record'
import { ACCOUNT_FEES, scriptPreview, settlementRequests } from '@/test/msw/settlements'
import {
  AFTER_DEBOUNCE,
  chooseDate,
  openReview,
  previewBodies,
  previewShown,
  processButton,
  validatedImport,
} from '@/test/settlement-screens'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Body = { batchFees: Record<string, unknown>[] }
const lastFees = () => (previewBodies().at(-1) as Body).batchFees

const fees = () => within(screen.getByRole('list', { name: 'Batch fees' }))
const row = (title: string) => within(fees().getByRole('listitem', { name: title }))
const amountOf = (title: string) => row(title).getByRole('textbox', { name: `Amount — ${title}` })
const descriptionOf = (title: string) => row(title).getByRole('textbox', { name: `Description — ${title}` })
const addPreset = () => screen.getByRole('combobox', { name: 'Add preset fee' })
const addFree = () => screen.getByRole('combobox', { name: 'Add free-amount fee' })

const UNKNOWN = {
  feeTypeId: null,
  code: null,
  title: 'Bank charge',
  amount: '12.0000',
  currency: 'USD',
  source: 'file' as const,
  warning: 'Fee type not in the catalog; kept as a free amount',
}

/** A validated import whose Other Fees are these rows (as GET /imports/{id} sends them). */
function withFileFees(sample: 'batch-clean' | 'batch-issues', batchFees: unknown[]) {
  const ids = validatedImport(sample)
  importRecord(ids.importId).batchFees = batchFees as never
  return ids
}

/** Waits for the debounce and the answer of the preview of the form as it is now. */
async function settled() {
  await wait(AFTER_DEBOUNCE)
  await previewShown()
}

describe('Settlement Review: fees pre-filled from Other Fees (spec "fees prellenados desde Other Fees")', () => {
  it('batch-clean: the two fees of the file, adjusted and removed (criterion 2 of the issue)', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)

    expect(row('Wire Fee').getByText('From file')).toBeInTheDocument()
    expect(amountOf('Wire Fee')).toHaveValue('25.0000')
    expect(amountOf('Settlement Fee')).toHaveValue('15.0000')
    chooseDate('2026-10-24')
    await previewShown()

    await user.clear(amountOf('Wire Fee'))
    await user.type(amountOf('Wire Fee'), '30.0000')
    await settled()
    expect(lastFees()[0]).toEqual({
      feeTypeId: 121,
      feeId: null,
      amount: '30.0000',
      description: 'Wire Fee',
      source: 'file',
    })

    await user.click(row('Settlement Fee').getByRole('button', { name: 'Remove Settlement Fee' }))
    await settled()
    expect(lastFees().map((f) => f.feeTypeId)).toEqual([121])
  })

  it('a fee of unknown type: marked, only free-amount types offered, no preview and Process says why', async () => {
    const { importId } = withFileFees('batch-clean', [UNKNOWN])
    await openReview(importId)
    chooseDate('2026-10-24')

    expect(
      row('Bank charge').getByText('Unknown fee type in the file: choose a free-amount type or remove the fee.'),
    ).toBeInTheDocument()
    const type = row('Bank charge').getByRole('combobox', { name: 'Fee type — Bank charge' })
    const options = within(type)
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(options).toContain('Special Adjustment')
    expect(options).not.toContain('Wire Fee')
    expect(processButton()).toBeDisabled()
    expect(processButton()).toHaveAccessibleDescription(/Choose a type for the fees of unknown type, or remove them\./)
    await wait(AFTER_DEBOUNCE)
    expect(settlementRequests('preview')).toHaveLength(0)
  })

  it('a fee of unknown type with a type chosen goes with that type, from the file', async () => {
    const { importId } = withFileFees('batch-clean', [UNKNOWN])
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')

    await user.selectOptions(row('Bank charge').getByRole('combobox', { name: 'Fee type — Bank charge' }), '119')

    await settled()
    expect(row('Bank charge').queryByText(/Unknown fee type in the file/)).not.toBeInTheDocument()
    expect(lastFees()).toEqual([
      { feeTypeId: 119, feeId: null, amount: '12.0000', description: 'Bank charge', source: 'file' },
    ])
  })

  it('a fee of unknown type removed: the reason goes and the preview goes without it', async () => {
    const { importId } = withFileFees('batch-clean', [UNKNOWN, { ...UNKNOWN, title: 'Wire Fee', feeTypeId: 121 }])
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')

    await user.click(row('Bank charge').getByRole('button', { name: 'Remove Bank charge' }))

    await settled()
    expect(lastFees().map((f) => f.feeTypeId)).toEqual([121])
    expect(processButton()).not.toHaveAccessibleDescription(/unknown type/)
  })

  it('a fee of the file without amount asks for it', async () => {
    const { importId } = withFileFees('batch-clean', [{ ...UNKNOWN, feeTypeId: 121, title: 'Wire Fee', amount: null }])
    await openReview(importId)
    chooseDate('2026-10-24')

    expect(amountOf('Wire Fee')).toHaveValue('')
    expect(row('Wire Fee').getByText('Enter an amount with up to 4 decimals, other than zero.')).toBeInTheDocument()
  })
})

describe('Settlement Review: add a preset fee (spec "añadir un fee preestablecido")', () => {
  it('without a date it is disabled with its reason and the fees are not asked for', async () => {
    const { importId } = validatedImport()
    // Only the requests started by this test: one left in flight by the previous test may reach the fake after reset.
    const requests = recordRequests()
    await openReview(importId)

    expect(addPreset()).toBeDisabled()
    expect(addPreset()).toHaveAccessibleDescription('Choose the settlement date first.')
    await wait(AFTER_DEBOUNCE)
    expect(requests.calls.filter((c) => /\/accounts\/[^/]+\/fees$/.test(c))).toEqual([])
  })

  it('the presets in force on the date, asked again when the date changes', async () => {
    const { importId } = validatedImport()
    await openReview(importId)

    chooseDate('2026-10-24')
    await waitFor(() => expect(settlementRequests('fees').at(-1)?.url).toContain('asOf=2026-10-24'))
    expect(settlementRequests('fees').at(-1)!.url).toContain('transactional=false')
    chooseDate('2026-10-25')
    await waitFor(() => expect(settlementRequests('fees').at(-1)?.url).toContain('asOf=2026-10-25'))
  })

  it('a preset with a fixed amount (HU3 CA2): comes with it, adjustable, and goes with its feeId', async () => {
    const { importId } = withFileFees('batch-issues', [])
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await waitFor(() => expect(addPreset()).toBeEnabled())

    await user.selectOptions(addPreset(), within(addPreset()).getByRole('option', { name: /^Monthly Fee/ }))

    expect(row('Monthly Fee').getByText('Preset')).toBeInTheDocument()
    expect(amountOf('Monthly Fee')).toHaveValue('250.0000')
    expect(amountOf('Monthly Fee')).toHaveFocus()
    await user.clear(amountOf('Monthly Fee'))
    await user.type(amountOf('Monthly Fee'), '240.0000')
    await settled()
    expect(lastFees()).toEqual([
      { feeTypeId: 111, feeId: 'f0000000-0000-4000-8000-000000000311', amount: '240.0000', source: 'manual' },
    ])
  })

  it('the validity of a preset is a day without ET (spec "Vigencia de un fee preestablecido")', async () => {
    const original = ACCOUNT_FEES['ProviderB-Main']
    ACCOUNT_FEES['ProviderB-Main'] = original.map((fee) => ({ ...fee, startDate: businessDate('2026-01-01') }))
    onTestFinished(() => {
      ACCOUNT_FEES['ProviderB-Main'] = original
    })
    const { importId } = withFileFees('batch-issues', [])
    await openReview(importId)
    chooseDate('2026-10-24')
    await waitFor(() => expect(addPreset()).toBeEnabled())

    const option = within(addPreset()).getByRole('option', { name: /^Monthly Fee/ })
    expect(option.textContent).toMatch(/ · 2026-01-01 – no end$/)
  })

  it('a percentage-only preset comes empty: the screen does not compute it, and no preview until it is written', async () => {
    const { importId } = withFileFees('batch-clean', [])
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()
    await waitFor(() => expect(addPreset()).toBeEnabled())
    const before = settlementRequests('preview').length

    await user.selectOptions(addPreset(), within(addPreset()).getByRole('option', { name: /^Chargeback over 1%/ }))

    expect(amountOf('Chargeback over 1%')).toHaveValue('')
    expect(
      row('Chargeback over 1%').getByText('Percentage-only fee (rate 0.010000): enter the amount.'),
    ).toBeInTheDocument()
    await wait(AFTER_DEBOUNCE)
    expect(settlementRequests('preview')).toHaveLength(before)

    await user.type(amountOf('Chargeback over 1%'), '12.5000')
    await settled()
    expect(lastFees()).toEqual([
      { feeTypeId: 105, feeId: 'f0000000-0000-4000-8000-000000000105', amount: '12.5000', source: 'manual' },
    ])
  })
})

describe('Settlement Review: add a free-amount fee (spec "añadir un fee de importe libre")', () => {
  it('offers only the types that admit a free amount', async () => {
    const { importId } = validatedImport()
    await openReview(importId)

    // The list fills in when GET /fee-types answers.
    await waitFor(() => expect(addFree()).toBeEnabled())
    const options = within(addFree())
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(options).toEqual(expect.arrayContaining(['Special Adjustment', 'Bram Fine']))
    expect(options).not.toContain('Wire Fee')
    expect(options).not.toContain('MDR')
  })

  it('a negative adjustment with its description (HU3 CA2)', async () => {
    const { importId } = withFileFees('batch-clean', [])
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')

    await user.selectOptions(addFree(), within(addFree()).getByRole('option', { name: 'Special Adjustment' }))
    expect(row('Special Adjustment').getByText('Free amount')).toBeInTheDocument()
    await user.type(amountOf('Special Adjustment'), '-42.5000')
    await user.type(descriptionOf('Special Adjustment'), 'Duplicate in batch 118')

    await settled()
    expect(lastFees()).toEqual([
      { feeTypeId: 119, feeId: null, amount: '-42.5000', description: 'Duplicate in batch 118', source: 'manual' },
    ])
  })

  it('without a description: the error in the row and no preview', async () => {
    const { importId } = withFileFees('batch-clean', [])
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()
    const before = settlementRequests('preview').length

    await user.selectOptions(addFree(), within(addFree()).getByRole('option', { name: 'Special Adjustment' }))
    await user.type(amountOf('Special Adjustment'), '5.0000')

    expect(row('Special Adjustment').getByText('Write a description for a free-amount fee.')).toBeInTheDocument()
    await wait(AFTER_DEBOUNCE)
    expect(settlementRequests('preview')).toHaveLength(before)
  })
})

describe('Settlement Review: amounts of the fees (spec "importes de los fees")', () => {
  it('an amount that is not valid: the error in its row and no preview with it', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()
    const before = settlementRequests('preview').length

    await user.clear(amountOf('Wire Fee'))
    await user.type(amountOf('Wire Fee'), '12.34567')

    expect(row('Wire Fee').getByText('Enter an amount with up to 4 decimals, other than zero.')).toBeInTheDocument()
    await wait(AFTER_DEBOUNCE)
    expect(settlementRequests('preview')).toHaveLength(before)
  })

  it('an amount with many digits goes exactly as written', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')

    await user.clear(amountOf('Wire Fee'))
    await user.type(amountOf('Wire Fee'), '123456789012345.1234')

    await settled()
    expect(lastFees()[0]!.amount).toBe('123456789012345.1234')
  })

  it('typing an amount in a row (spec "escritura seguida"): one request with 30.5', async () => {
    const { importId } = validatedImport()
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')
    await previewShown()
    await user.clear(amountOf('Wire Fee'))
    const before = settlementRequests('preview').length

    await user.type(amountOf('Wire Fee'), '30.5')

    await settled()
    const sent = (previewBodies().slice(before) as Body[]).map((b) => b.batchFees[0]!.amount)
    expect(sent).toEqual(['30.5'])
  })
})

describe('Settlement Review: fee rejected by the API (spec "fee rechazado por el API")', () => {
  it('free_amount_not_allowed in its row, Process disabled until the row changes', async () => {
    const { importId } = validatedImport()
    scriptPreview(importId, [
      { status: 400, code: 'batch_fee_invalid', details: { index: 1, reason: 'free_amount_not_allowed' } },
    ])
    const { user } = await openReview(importId)
    chooseDate('2026-10-24')

    expect(
      await row('Settlement Fee').findByText('This fee type does not accept a free amount.', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(processButton()).toBeDisabled()
    expect(processButton()).toHaveAccessibleDescription(/Fix the highlighted fields\./)

    await user.clear(amountOf('Settlement Fee'))
    await user.type(amountOf('Settlement Fee'), '16.0000')
    expect(row('Settlement Fee').queryByText('This fee type does not accept a free amount.')).not.toBeInTheDocument()
    await settled()
  })

  it('fee_not_in_force in its row', async () => {
    const { importId } = validatedImport()
    scriptPreview(importId, [
      { status: 400, code: 'batch_fee_invalid', details: { index: 0, reason: 'fee_not_in_force' } },
    ])
    await openReview(importId)
    chooseDate('2026-10-24')

    expect(
      await row('Wire Fee').findByText(
        'This preset fee is not in force on the settlement date.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })

  it('description_required in the description of its row', async () => {
    const { importId } = validatedImport()
    scriptPreview(importId, [
      { status: 400, code: 'batch_fee_invalid', details: { index: 1, reason: 'description_required' } },
    ])
    await openReview(importId)
    chooseDate('2026-10-24')

    const message = await row('Settlement Fee').findByText(
      'Write a description for a free-amount fee.',
      {},
      { timeout: 3000 },
    )
    expect(descriptionOf('Settlement Fee')).toHaveAccessibleDescription(/Write a description for a free-amount fee\./)
    expect(message).toBeInTheDocument()
  })
})
