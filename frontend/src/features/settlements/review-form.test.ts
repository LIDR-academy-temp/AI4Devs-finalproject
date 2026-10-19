// The form of Settlement Review as pure functions (web-settlement design D4): the schema the screen validates with
// and the body it sends. Everything is text: an amount is sent exactly as written.
import { describe, expect, it } from 'vitest'
import { type FeeRow, type ReviewFormValues, reviewFormSchema, toRequest } from './review-form'

const fileRow = (overrides: Partial<FeeRow> = {}): FeeRow => ({
  key: 'f1',
  origin: 'file',
  feeTypeId: 121,
  feeId: null,
  title: 'Wire Fee',
  amount: '25.0000',
  description: 'Wire Fee',
  ...overrides,
})

const values = (overrides: Partial<ReviewFormValues> = {}): ReviewFormValues => ({
  batchNo: '123',
  settlementDate: '2026-10-24',
  fees: [fileRow()],
  confirmChannels: false,
  ...overrides,
})

/** The messages of the schema by path ("batchNo", "fees.0.amount"…). */
function errorsOf(input: ReviewFormValues): Record<string, string> {
  const result = reviewFormSchema.safeParse(input)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
}

describe('Settlement Review form: batch number', () => {
  it('accepts a positive whole number', () => {
    expect(errorsOf(values({ batchNo: '123' }))).toEqual({})
  })

  it.each(['0', '-1', '12a', '1.5', ''])('rejects %j', (batchNo) => {
    expect(errorsOf(values({ batchNo }))).toEqual({ batchNo: 'Enter a positive whole number.' })
  })
})

describe('Settlement Review form: settlement date', () => {
  it('accepts a business date', () => {
    expect(errorsOf(values({ settlementDate: '2026-10-24' }))).toEqual({})
  })

  it('requires it', () => {
    expect(errorsOf(values({ settlementDate: '' }))).toEqual({ settlementDate: 'Choose the settlement date.' })
  })

  it.each(['2026-02-30', '24/10/2026'])('rejects %j', (settlementDate) => {
    expect(errorsOf(values({ settlementDate }))).toHaveProperty('settlementDate')
  })
})

describe('Settlement Review form: amounts', () => {
  it.each(['25.0000', '-42.5000', '30', '123456789012345.1234'])('accepts %j', (amount) => {
    expect(errorsOf(values({ fees: [fileRow({ amount })] }))).toEqual({})
  })

  it.each(['12.34567', '0', '-0.0000', '1,5', '1e3', ''])('rejects %j', (amount) => {
    expect(errorsOf(values({ fees: [fileRow({ amount })] }))).toEqual({
      'fees.0.amount': 'Enter an amount with up to 4 decimals, other than zero.',
    })
  })
})

describe('Settlement Review form: rows', () => {
  it('requires a description only in a free-amount row', () => {
    const free = fileRow({ key: 'x', origin: 'free', feeTypeId: 119, title: 'Special Adjustment', description: ' ' })
    expect(errorsOf(values({ fees: [free] }))).toEqual({
      'fees.0.description': 'Write a description for a free-amount fee.',
    })
    expect(errorsOf(values({ fees: [fileRow({ description: '' })] }))).toEqual({})
    expect(
      errorsOf(
        values({ fees: [fileRow({ key: 'p', origin: 'preset', feeId: 'f-1', feeTypeId: 111, description: '' })] }),
      ),
    ).toEqual({})
  })

  it('limits any description to 200 characters', () => {
    expect(errorsOf(values({ fees: [fileRow({ description: 'x'.repeat(201) })] }))).toHaveProperty('fees.0.description')
  })

  it('does not accept a file row of unknown type until it has one', () => {
    const unknown = fileRow({ feeTypeId: null, title: 'Bank charge', fileWarning: 'Fee type not in the catalog' })
    expect(errorsOf(values({ fees: [unknown] }))).toEqual({
      'fees.0.feeTypeId': 'Unknown fee type in the file: choose a free-amount type or remove the fee.',
    })
    expect(errorsOf(values({ fees: [{ ...unknown, feeTypeId: 119 }] }))).toEqual({})
  })
})

describe('Settlement Review form: the body', () => {
  const rows: FeeRow[] = [
    fileRow(),
    fileRow({ key: 'f2', feeTypeId: 117, title: 'Settlement Fee', amount: '15.0000', description: '' }),
    {
      key: 'p1',
      origin: 'preset',
      feeTypeId: 111,
      feeId: 'f0000000-0000-4000-8000-000000000311',
      title: 'Monthly Fee',
      amount: '240.0000',
      description: '',
    },
    {
      key: 'x1',
      origin: 'free',
      feeTypeId: 119,
      feeId: null,
      title: 'Special Adjustment',
      amount: '-42.5000',
      description: '  Duplicate in batch 118 ',
    },
    fileRow({ key: 'f3', amount: '123456789012345.1234' }),
  ]

  it('sends the run, the number as an integer, the date and the fees in order, with the amounts as written', () => {
    expect(toRequest(values({ fees: rows }), 12, false)).toEqual({
      runId: 12,
      batchNo: 123,
      settlementDate: '2026-10-24',
      batchFees: [
        { feeTypeId: 121, feeId: null, amount: '25.0000', description: 'Wire Fee', source: 'file' },
        { feeTypeId: 117, feeId: null, amount: '15.0000', source: 'file' },
        {
          feeTypeId: 111,
          feeId: 'f0000000-0000-4000-8000-000000000311',
          amount: '240.0000',
          source: 'manual',
        },
        { feeTypeId: 119, feeId: null, amount: '-42.5000', description: 'Duplicate in batch 118', source: 'manual' },
        { feeTypeId: 121, feeId: null, amount: '123456789012345.1234', description: 'Wire Fee', source: 'file' },
      ],
    })
  })

  it('confirms the channel assignment only when it is required and checked', () => {
    expect(toRequest(values({ confirmChannels: true }), 12, false)).not.toHaveProperty('confirmChannelAssignment')
    expect(toRequest(values({ confirmChannels: false }), 12, true)).not.toHaveProperty('confirmChannelAssignment')
    expect(toRequest(values({ confirmChannels: true }), 12, true)).toMatchObject({ confirmChannelAssignment: true })
  })

  it('sends no batch fees as an empty list', () => {
    expect(toRequest(values({ fees: [] }), 12, false).batchFees).toEqual([])
  })
})
