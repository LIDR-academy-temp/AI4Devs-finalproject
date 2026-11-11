import { describe, expect, it } from 'vitest'
import { FEE_TYPES } from '../../../../prisma/synthetic.js'
import { type BatchFeeSheet, prefillBatchFees } from './batch-fees.js'

// README §1.2 "Importación…" (Other Fees prefilled), §4.2 `batchFees`; spec "Fees por batch prellenados desde la hoja de fees" (design D10).
const feeTypes = FEE_TYPES.map((f) => ({ feeTypeId: f.feeTypeId, code: f.code, title: f.title }))
const wire = feeTypes.find((f) => f.title === 'Wire Fee')
const settlement = feeTypes.find((f) => f.title === 'Settlement Fee')

function sheet(rows: string[][]): BatchFeeSheet {
  return {
    headers: ['Type of Fee', 'Amount', 'Currency'],
    rows: rows.map((cells, i) => ({ rowNo: i + 2, cells, lossyNumeric: [] })),
    columns: [
      { sourceColumn: 'Type of Fee', targetField: 'feeType' },
      { sourceColumn: 'Amount', targetField: 'amount' },
      { sourceColumn: 'Currency', targetField: 'currency' },
    ],
  }
}

describe('prefillBatchFees', () => {
  it('resolves the two template fees of batch-clean against the catalog', () => {
    const fees = prefillBatchFees(
      [
        sheet([
          ['Wire Fee', '25', 'USD'],
          ['Settlement Fee', '15', 'USD'],
        ]),
      ],
      feeTypes,
    )

    expect(fees).toEqual([
      {
        feeTypeId: wire?.feeTypeId,
        code: wire?.code,
        title: 'Wire Fee',
        amount: '25.0000',
        currency: 'USD',
        source: 'file',
      },
      {
        feeTypeId: settlement?.feeTypeId,
        code: settlement?.code,
        title: 'Settlement Fee',
        amount: '15.0000',
        currency: 'USD',
        source: 'file',
      },
    ])
  })

  it('keeps an unknown type as a free amount with its text and a warning (batch-issues)', () => {
    const fees = prefillBatchFees(
      [
        sheet([
          ['Wire Fee', '25', 'USD'],
          ['Fraud Monitoring Fee', '99', 'USD'],
        ]),
      ],
      feeTypes,
    )

    expect(fees[1]).toEqual({
      feeTypeId: null,
      code: null,
      title: 'Fraud Monitoring Fee',
      amount: '99.0000',
      currency: 'USD',
      source: 'file',
      warning: expect.stringMatching(/not in the catalog/i),
    })
  })

  it('matches the title ignoring case and surrounding spaces, and the code as well', () => {
    const fees = prefillBatchFees(
      [
        sheet([
          [' wire fee ', '1', 'usd'],
          [wire?.code ?? '', '2', 'USD'],
        ]),
      ],
      feeTypes,
    )

    expect(fees.map((f) => f.feeTypeId)).toEqual([wire?.feeTypeId, wire?.feeTypeId])
    expect(fees[0]).toMatchObject({ title: 'Wire Fee', currency: 'USD' })
  })

  it('skips rows without type and amount, and warns about an unreadable amount', () => {
    const fees = prefillBatchFees(
      [
        sheet([
          ['', '', ''],
          ['Wire Fee', 'abc', 'USD'],
        ]),
      ],
      feeTypes,
    )

    expect(fees).toHaveLength(1)
    expect(fees[0]).toMatchObject({ title: 'Wire Fee', amount: null, warning: expect.stringMatching(/amount/i) })
  })

  it('reads several batch_fees sheets in order and tolerates a sheet without amount column', () => {
    const noAmount: BatchFeeSheet = {
      headers: ['Type of Fee'],
      rows: [{ rowNo: 2, cells: ['Settlement Fee'], lossyNumeric: [] }],
      columns: [{ sourceColumn: 'Type of Fee', targetField: 'feeType' }],
    }

    const fees = prefillBatchFees([sheet([['Wire Fee', '25', 'USD']]), noAmount], feeTypes)

    expect(fees.map((f) => f.title)).toEqual(['Wire Fee', 'Settlement Fee'])
    expect(fees[1]).toMatchObject({ amount: null, currency: null })
  })
})
