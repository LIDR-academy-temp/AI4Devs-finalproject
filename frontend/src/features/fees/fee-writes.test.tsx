import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { feeFixture, feeRequests, respondNextFee, seedAccountFees } from '@/test/msw/fees'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'
import { strings } from './strings'

// Spec fees "Pantalla Account Fees: alta", "corrección en el sitio", "cambio desde una fecha", "cierre de la
// vigencia" and "errores del API" (web-admin-fees design D4–D7, D9). The fake stores the writes; its 409s are scripted.
const s = strings.account
const f = strings.form
const USD = ACCOUNT_IDS['ProviderA-USD']
const OTHER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

afterEach(() => {
  vi.useRealTimers()
})

async function openAccount() {
  const rendered = renderApp(`/accounts/${USD}/fees`, { as: 'admin' })
  await screen.findByRole('table', { name: s.tableLabel }, OPENING)
  return rendered
}

// hidden: while a dialog is open, the page behind it is aria-hidden but still on screen.
const bodyRows = () =>
  within(screen.getByRole('table', { name: s.tableLabel, hidden: true }))
    .getAllByRole('row', { hidden: true })
    .slice(1)

function rowOf(title: string, validFrom: string) {
  const row = bodyRows().find((r) => {
    const cells = within(r).getAllByRole('cell', { hidden: true })
    return cells[0]?.textContent === title && cells[3]?.textContent === validFrom
  })
  if (!row) throw new Error(`No row ${title} from ${validFrom}`)
  return within(row)
}

const day = (label: string, value: string, container: Pick<typeof screen, 'getByLabelText'> = screen) =>
  fireEvent.change(container.getByLabelText(label), { target: { value } })

/** The single fee of the account, seeded for the test. */
function seedOne(overrides: Partial<Parameters<typeof feeFixture>[0]> = {}) {
  const fee = feeFixture({
    feeTypeId: 1,
    percentage: '0.025000',
    inUse: false,
    lastAppliedEventDate: null,
    ...overrides,
  })
  seedAccountFees('ProviderA-USD', [fee])
  return fee
}

describe('Account fees: add a fee', () => {
  it('creates a Wire Fee of 15 open on both sides and shows it in the list', async () => {
    const { user } = await openAccount()

    await user.click(screen.getByRole('button', { name: s.add }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.create }))
    await user.selectOptions(form.getByLabelText(f.labels.feeType), 'Wire Fee')
    await user.type(form.getByLabelText(f.labels.fixedAmount), '15')
    await user.click(form.getByRole('button', { name: f.save }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(feeRequests('create').at(-1)!.body).toEqual({
      feeTypeId: 121,
      fixedAmount: '15',
      startDate: null,
      endDate: null,
    })
    expect(rowOf('Wire Fee', 'always').getAllByRole('cell')[2]).toHaveTextContent('15.0000')
  })

  it('a percentage from a day goes as a fraction, and the new fee is scheduled', async () => {
    const { user } = await openAccount()

    await user.click(screen.getByRole('button', { name: s.add }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.create }))
    await user.selectOptions(form.getByLabelText(f.labels.feeType), 'MDR')
    await user.type(form.getByLabelText(f.labels.percent), '2.75')
    await user.click(form.getByLabelText(f.labels.always))
    day(f.labels.validFrom, '2027-01-01', form)
    await user.click(form.getByRole('button', { name: f.save }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(feeRequests('create').at(-1)!.body).toEqual({
      feeTypeId: 1,
      percentage: '0.027500',
      startDate: '2027-01-01',
      endDate: null,
    })
    const row = rowOf('MDR', '2027-01-01')
    expect(row.getByText('Scheduled')).toBeInTheDocument()
    expect(row.getByText('2.750 %')).toBeInTheDocument()
  })

  it('without amount nor percentage it says so next to both fields and sends nothing', async () => {
    const { user } = await openAccount()

    await user.click(screen.getByRole('button', { name: s.add }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.create }))
    await user.selectOptions(form.getByLabelText(f.labels.feeType), 'MDR')
    await user.click(form.getByRole('button', { name: f.save }))

    expect(form.getByLabelText(f.labels.fixedAmount)).toHaveAccessibleDescription(f.errors.amountOrPercent)
    expect(form.getByLabelText(f.labels.percent)).toHaveAccessibleDescription(f.errors.amountOrPercent)
    expect(feeRequests('create')).toHaveLength(0)
  })

  it('a double click on Save fee sends one POST', async () => {
    const { user } = await openAccount()

    await user.click(screen.getByRole('button', { name: s.add }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.create }))
    await user.selectOptions(form.getByLabelText(f.labels.feeType), 'Wire Fee')
    await user.type(form.getByLabelText(f.labels.fixedAmount), '15')
    await user.dblClick(form.getByRole('button', { name: f.save }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(feeRequests('create')).toHaveLength(1)
  })
})

describe('Account fees: correct in place', () => {
  it('corrects a fee without use with only the changed field and the reason', async () => {
    seedOne()
    const { user } = await openAccount()

    await user.click(rowOf('MDR', 'always').getByRole('button', { name: s.actions.edit }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.correct('MDR') }))
    await user.clear(form.getByLabelText(f.labels.percent))
    await user.type(form.getByLabelText(f.labels.percent), '2.75')
    await user.type(form.getByLabelText(f.labels.reason), 'typo')
    await user.click(form.getByRole('button', { name: f.save }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(feeRequests('patch').at(-1)!.body).toEqual({ percentage: '0.027500', reason: 'typo' })
    expect(rowOf('MDR', 'always').getByText('2.750 %')).toBeInTheDocument()
  })

  it('a fee in use shows its values but lets edit only the description and the end, and says why', async () => {
    seedOne({ inUse: true, lastAppliedEventDate: '2026-10-15' })
    const { user } = await openAccount()

    await user.click(rowOf('MDR', 'always').getByRole('button', { name: s.actions.edit }))
    const dialog = await screen.findByRole('dialog', { name: f.titles.correct('MDR') })
    const form = within(dialog)

    expect(form.getByLabelText(f.labels.fixedAmount)).toBeDisabled()
    expect(form.getByLabelText(f.labels.percent)).toBeDisabled()
    expect(form.getByLabelText(f.labels.percent)).toHaveValue('2.5')
    expect(form.getByLabelText(f.labels.validFrom)).toBeDisabled()
    expect(form.getByLabelText(f.labels.description)).toBeEnabled()
    expect(form.getByLabelText(f.labels.noEnd)).toBeEnabled()
    expect(form.getByRole('form')).toHaveAccessibleDescription(f.inUseNotice)
  })

  it('saving without changes says Nothing to save and sends nothing', async () => {
    seedOne()
    const { user } = await openAccount()

    await user.click(rowOf('MDR', 'always').getByRole('button', { name: s.actions.edit }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.correct('MDR') }))
    await user.click(form.getByRole('button', { name: f.save }))

    expect(form.getByText(f.errors.nothingToSave)).toBeInTheDocument()
    expect(feeRequests('patch')).toHaveLength(0)
  })
})

describe('Account fees: change from a date', () => {
  it('closes the fee the day before and shows the successor with the new value', async () => {
    seedOne({ percentage: '0.100000', inUse: true, lastAppliedEventDate: '2026-10-15' })
    const { user } = await openAccount()

    await user.click(rowOf('MDR', 'always').getByRole('button', { name: s.actions.change }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.change('MDR') }))
    expect(form.getByText(f.changeNotice)).toBeInTheDocument()
    day(f.labels.effectiveFrom, '2026-11-01', form)
    expect(form.getByText(f.endsOn('2026-10-31'))).toBeInTheDocument()
    await user.clear(form.getByLabelText(f.labels.percent))
    await user.type(form.getByLabelText(f.labels.percent), '9.5')
    await user.click(form.getByRole('button', { name: f.apply }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(feeRequests('patch').at(-1)!.body).toEqual({ effectiveFrom: '2026-11-01', percentage: '0.095000' })
    expect(rowOf('MDR', 'always').getByText('2026-10-31')).toBeInTheDocument()
    expect(rowOf('MDR', '2026-11-01').getByText('9.500 %')).toBeInTheDocument()
  })

  it('without a new value it says so and sends nothing', async () => {
    seedOne({ percentage: '0.100000', inUse: true, lastAppliedEventDate: '2026-10-15' })
    const { user } = await openAccount()

    await user.click(rowOf('MDR', 'always').getByRole('button', { name: s.actions.change }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.change('MDR') }))
    day(f.labels.effectiveFrom, '2026-11-01', form)
    await user.click(form.getByRole('button', { name: f.apply }))

    expect(form.getByText(f.errors.changeAValue)).toBeInTheDocument()
    expect(feeRequests('patch')).toHaveLength(0)
  })
})

describe('Account fees: close the validity', () => {
  it('the end date starts at today in New York, not in UTC', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-04T03:30:00.000Z'))
    seedOne()
    const { user } = await openAccount()

    await user.click(rowOf('MDR', 'always').getByRole('button', { name: s.actions.close }))
    const dialog = within(await screen.findByRole('alertdialog', { name: f.close.title('MDR') }))

    expect(dialog.getByLabelText(f.close.endDate)).toHaveValue('2026-11-03')
  })

  it('closes after the last applied event', async () => {
    seedOne({ feeTypeId: 4, percentage: null, fixedAmount: '15.0000', inUse: true, lastAppliedEventDate: '2026-10-15' })
    const { user } = await openAccount()

    await user.click(rowOf('Chargeback per txn fee', 'always').getByRole('button', { name: s.actions.close }))
    const dialog = within(await screen.findByRole('alertdialog', { name: f.close.title('Chargeback per txn fee') }))
    expect(dialog.getByText(f.close.minimum('2026-10-15'))).toBeInTheDocument()
    day(f.close.endDate, '2026-10-31', dialog)
    await user.click(dialog.getByRole('button', { name: f.close.confirm }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(feeRequests('patch').at(-1)!.body).toEqual({ endDate: '2026-10-31' })
    expect(rowOf('Chargeback per txn fee', 'always').getByText('2026-10-31')).toBeInTheDocument()
  })

  it('a day before the last applied event cannot be sent, and the button says why', async () => {
    seedOne({ feeTypeId: 4, percentage: null, fixedAmount: '15.0000', inUse: true, lastAppliedEventDate: '2026-10-15' })
    const { user } = await openAccount()

    await user.click(rowOf('Chargeback per txn fee', 'always').getByRole('button', { name: s.actions.close }))
    const dialog = within(await screen.findByRole('alertdialog', { name: f.close.title('Chargeback per txn fee') }))
    day(f.close.endDate, '2026-10-01', dialog)

    const confirm = dialog.getByRole('button', { name: f.close.confirm })
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveAccessibleDescription(f.close.minimum('2026-10-15'))
    expect(feeRequests('patch')).toHaveLength(0)
  })
})

describe('Account fees: errors of the API', () => {
  it('fee_overlap lists the conflict and keeps the form open with what was written', async () => {
    const { user } = await openAccount()
    respondNextFee('create', {
      status: 409,
      code: 'fee_overlap',
      details: { conflicts: [{ feeId: OTHER, startDate: '2026-01-01', endDate: null }] },
    })

    await user.click(screen.getByRole('button', { name: s.add }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.create }))
    await user.selectOptions(form.getByLabelText(f.labels.feeType), 'MDR')
    await user.type(form.getByLabelText(f.labels.percent), '2.75')
    await user.click(form.getByLabelText(f.labels.always))
    day(f.labels.validFrom, '2026-11-01', form)
    await user.click(form.getByRole('button', { name: f.save }))

    expect(await form.findByText(f.errors.overlap('MDR'))).toBeInTheDocument()
    expect(form.getByText('2026-01-01 → open')).toBeInTheDocument()
    expect(form.getByLabelText(f.labels.percent)).toHaveValue('2.75')
  })

  it('a domain 400 goes next to its field', async () => {
    const { user } = await openAccount()
    respondNextFee('create', {
      status: 400,
      code: 'validation_error',
      message: 'endDate must not be before startDate',
      details: { field: 'endDate' },
    })

    await user.click(screen.getByRole('button', { name: s.add }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.create }))
    await user.selectOptions(form.getByLabelText(f.labels.feeType), 'Wire Fee')
    await user.type(form.getByLabelText(f.labels.fixedAmount), '15')
    await user.click(form.getByRole('button', { name: f.save }))

    await waitFor(() =>
      expect(form.getByLabelText(f.labels.validTo)).toHaveAccessibleDescription('endDate must not be before startDate'),
    )
  })

  it('a fee that started being used says the field is no longer editable and asks the list again', async () => {
    const fee = seedOne()
    const { user } = await openAccount()
    await user.click(rowOf('MDR', 'always').getByRole('button', { name: s.actions.edit }))
    const form = within(await screen.findByRole('dialog', { name: f.titles.correct('MDR') }))
    // Meanwhile a settlement applied it.
    seedAccountFees('ProviderA-USD', [{ ...fee, inUse: true, lastAppliedEventDate: '2026-11-02' }])
    respondNextFee('patch', { status: 409, code: 'fee_in_use', details: { fields: ['percentage'] } })
    const reads = feeRequests('accountFees').length

    await user.clear(form.getByLabelText(f.labels.percent))
    await user.type(form.getByLabelText(f.labels.percent), '3')
    await user.click(form.getByRole('button', { name: f.save }))

    expect(await form.findByText(f.errors.inUseFields(['Percentage']))).toBeInTheDocument()
    await waitFor(() => expect(feeRequests('accountFees').length).toBeGreaterThan(reads))
    await waitFor(() => expect(rowOf('MDR', 'always').getByText(s.inUse)).toBeInTheDocument())
  })
})
