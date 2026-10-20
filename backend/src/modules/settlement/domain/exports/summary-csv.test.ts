import type { SettlementView } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { Prisma } from '../../../../generated/prisma/client.js'
import { expectedOf } from '../../../validation/test-support/builders.js'
import { exampleView } from '../../test-support/example-view.js'
import { payableBreakdown } from '../payable-breakdown.js'
import { summaryCsv, warningTransactionIds } from './summary-csv.js'

// Spec settlement "Summary del merchant" (design D7): nine blocks, each with its header and separated by an empty line;
// the figures of the view, never recalculated; business dates without converting and processedAt in ET.
interface Summary {
  qty: Record<string, number>
  amounts: Record<string, string>
  fees: Record<string, string>
  otherFeeAmt: string
  amountPayable: string
}
const expected = expectedOf('batch-clean').summary as unknown as Summary
const analyst = { userId: 2, userName: 'analyst' }

/** batch-clean as processed, with the figures of its expected.json. */
function batchCleanView(overrides: Partial<SettlementView> = {}): SettlementView {
  const { lines } = payableBreakdown({
    deposit: expected.amounts.deposit!,
    chargeback: expected.amounts.chargeback!,
    refund: expected.amounts.refund!,
    rdr: expected.amounts.rdr!,
    transactionalFees: expected.fees.total!,
    batchFees: expected.otherFeeAmt,
    reserveHeld: expected.amounts.reserveHeld!,
    reserveReleased: expected.amounts.reserveReleased!,
    reserveEarlyReleased: '0.0000',
  })
  return exampleView({
    channels: ['RAM-01', 'RAM-07'],
    dateRanges: {
      APP: { min: '2026-09-28T00:04:11.000Z', max: '2026-10-07T23:58:40.000Z' },
      DEC: null,
      I: null,
      R: null,
    },
    movements: { E: 450, I: 10, R: 320 },
    totals: (['deposit', 'declined', 'chargeback', 'refund', 'rdr'] as const).map((category) => ({
      category,
      qty: expected.qty[category]!,
      amount: expected.amounts[category] ?? '0.0000',
      feeAmount: expected.fees[category]!,
      feeRate: category === 'deposit' ? '0.100000' : null,
    })),
    reservesReleasedQty: expected.qty.reservesReleased!,
    batchFees: [
      {
        batchFeeId: 1,
        feeTypeId: 9,
        code: 'WireFee',
        title: 'Wire Fee',
        feeId: null,
        amount: '25.0000',
        description: 'Wire Fee',
        source: 'file',
        enteredBy: analyst,
      },
      {
        batchFeeId: 2,
        feeTypeId: 10,
        code: 'SettlementFee',
        title: 'Settlement Fee',
        feeId: null,
        amount: '15.0000',
        description: 'Settlement Fee',
        source: 'file',
        enteredBy: analyst,
      },
    ],
    transactionalFeeAmt: expected.fees.total!,
    otherFeeAmt: expected.otherFeeAmt,
    reserveHeldAmt: expected.amounts.reserveHeld!,
    reserveReleasedAmt: expected.amounts.reserveReleased!,
    amountPayable: expected.amountPayable,
    payableBreakdown: lines,
    ...overrides,
  })
}

/** The blocks of a summary as lists of lines, header first. */
function blocks(body: string): string[][] {
  expect(body.endsWith('\r\n')).toBe(true)
  return body
    .slice(0, -2)
    .split('\r\n\r\n')
    .map((block) => block.split('\r\n'))
}
/** Without warnings that name a transaction there is nothing to translate. */
const summarize = (view: SettlementView, sourceIds: ReadonlyMap<string, string> = new Map()) =>
  summaryCsv(view, sourceIds)
const block = (body: string, header: string) => blocks(body).find((b) => b[0] === header)!
const fieldValue = (body: string, field: string) =>
  block(body, 'Field,Value')
    .find((l) => l.startsWith(`${field},`))
    ?.slice(field.length + 1)

describe('summary of batch-clean against its expected.json', () => {
  const body = summarize(batchCleanView())

  it('has nine blocks in order, each with its header', () => {
    expect(blocks(body).map((b) => b[0])).toEqual([
      'Field,Value',
      'Category,Qty,Amount,Fees,Fee rate',
      'Card brand,Qty,Amount',
      'Fee type,Description,Source,Amount,Entered by',
      'Item,Qty,Amount',
      'Line,Sign,Amount',
      'Item,Count',
      'Reason,Count',
      'Code,Transaction ID,Detail',
    ])
  })

  it('starts without a byte order mark', () => {
    expect(body.startsWith('Field,Value\r\n')).toBe(true)
  })

  it('writes the attempt', () => {
    expect(block(body, 'Field,Value').slice(1, 10)).toEqual([
      'Account,ProviderA-USD',
      'Batch,123',
      'Attempt,1',
      'Status,processed',
      'Payment,Pending payment',
      'Processed by,analyst',
      'Processed at,2026-10-19 11:40:03 ET',
      'Settlement date,',
      'Channels,RAM-01; RAM-07',
    ])
  })

  it('writes the totals by category of the oracle, with the labels of the screen', () => {
    expect(block(body, 'Category,Qty,Amount,Fees,Fee rate').slice(1)).toEqual([
      'Deposits,340,39181.0700,4139.1070,0.100000',
      'Declined,110,0.0000,27.5000,',
      'Chargebacks,2,193.8600,90.0000,',
      'Refunds,6,843.9900,30.0000,',
      'RDR,2,391.5500,50.0000,',
    ])
  })

  it('writes the brands and the batch fees, otherFeeAmt 40.0000 between them', () => {
    expect(block(body, 'Card brand,Qty,Amount').slice(1)).toEqual(['VISA,1,100.0000'])
    const fees = block(body, 'Fee type,Description,Source,Amount,Entered by').slice(1)
    expect(fees).toEqual([
      'Wire Fee,Wire Fee,file,25.0000,analyst',
      'Settlement Fee,Settlement Fee,file,15.0000,analyst',
    ])
    const sum = fees.reduce((s, l) => s.plus(l.split(',')[3]!), new Prisma.Decimal(0))
    expect(sum.toFixed(4)).toBe(expected.otherFeeAmt)
  })

  it('writes the reserves held and released of the oracle', () => {
    expect(block(body, 'Item,Qty,Amount').slice(1)).toEqual([
      'Reserve held,,3918.1070',
      'Reserve released,320,4314.4040',
      'Reserve released on chargeback,,0.0000',
    ])
  })

  it('writes the nine lines of the amount payable in order and Amount payable 33771.3600', () => {
    const lines = block(body, 'Line,Sign,Amount').slice(1)
    expect(lines.map((l) => l.split(',')[0])).toEqual([
      'Deposits',
      'Chargebacks',
      'Refunds',
      'RDR',
      'Transaction fees',
      'Batch fees',
      'Reserve held',
      'Reserve released',
      'Reserve released on chargeback',
      'Amount payable',
    ])
    expect(lines.at(-1)).toBe(`Amount payable,,${expected.amountPayable}`)
  })

  it('lets the formula be audited: the signed sum of the nine lines is the Amount payable row', () => {
    const lines = block(body, 'Line,Sign,Amount').slice(1)
    const total = lines.find((l) => l.startsWith('Amount payable,'))
    expect(total).toBeDefined()
    const breakdown = lines.filter((l) => !l.startsWith('Amount payable,'))
    expect(breakdown).toHaveLength(9)
    const sum = breakdown.reduce((s, l) => {
      const [, sign, amount] = l.split(',')
      return sign === '+' ? s.plus(amount!) : s.minus(amount!)
    }, new Prisma.Decimal(0))
    expect(sum.toFixed(4)).toBe(total!.split(',')[2])
    expect(sum.toFixed(4)).toBe(expected.amountPayable)
  })

  it('writes the issues of the validation run', () => {
    expect(block(body, 'Item,Count').slice(1)).toEqual([
      'Persistent,0',
      'Resolved,0',
      'Blocking,0',
      'Resolved missing,0',
    ])
  })

  it('writes the rows not processed by reason', () => {
    expect(block(body, 'Reason,Count').slice(1)).toEqual([
      'Ignored,0',
      'Unmatched,0',
      'Ambiguous,0',
      'Excluded,0',
      'Unresolved status,0',
      'Pending,0',
    ])
  })

  it('writes a row per warning', () => {
    expect(block(body, 'Code,Transaction ID,Detail').slice(1)).toEqual(['transactional_fees_not_computed,,'])
  })
})

describe('dates of the summary (spec scenario "Fechas del summary")', () => {
  const body = summarize(batchCleanView({ settlementDate: '2026-10-24' }))

  it('converts processedAt to New York time with ET', () => {
    expect(fieldValue(body, 'Processed at')).toBe('2026-10-19 11:40:03 ET')
  })

  it('writes the business ranges without converting, and an empty range as empty', () => {
    expect(fieldValue(body, 'APP range (ET)')).toBe('2026-09-28 00:04:11 - 2026-10-07 23:58:40')
    expect(fieldValue(body, 'DEC range (ET)')).toBe('')
    expect(fieldValue(body, 'I range (ET)')).toBe('')
    expect(fieldValue(body, 'R range (ET)')).toBe('')
  })

  it('writes the settlement date as it is', () => {
    expect(fieldValue(body, 'Settlement date')).toBe('2026-10-24')
  })
})

describe('summaryCsv details', () => {
  it('quotes a batch fee description with a comma and keeps the columns of the block', () => {
    const view = batchCleanView()
    const body = summarize({
      ...view,
      batchFees: [{ ...view.batchFees[0]!, description: 'Wire fee, October' }],
    })
    expect(block(body, 'Fee type,Description,Source,Amount,Entered by')[1]).toBe(
      'Wire Fee,"Wire fee, October",file,25.0000,analyst',
    )
  })

  it('writes a negative batch fee with its sign and an empty description as empty', () => {
    const view = batchCleanView()
    const body = summarize({
      ...view,
      batchFees: [{ ...view.batchFees[0]!, amount: '-25.0000', description: null, source: 'manual' }],
    })
    expect(block(body, 'Fee type,Description,Source,Amount,Entered by')[1]).toBe('Wire Fee,,manual,-25.0000,analyst')
  })

  it('says Not available in Issues and Not processed for an attempt without settlement.process audit', () => {
    const body = summarize(batchCleanView({ validationSummary: null, warnings: [] }))
    expect(block(body, 'Item,Count').slice(1)).toEqual(['Not available,'])
    expect(block(body, 'Reason,Count').slice(1)).toEqual(['Not available,'])
    expect(block(body, 'Line,Sign,Amount').at(-1)).toBe(`Amount payable,,${expected.amountPayable}`)
  })

  it('takes the payment from settledStatus', () => {
    const payment = (settledStatus: SettlementView['settledStatus']) =>
      fieldValue(summarize(batchCleanView({ settledStatus })), 'Payment')
    expect(payment('pending_payment')).toBe('Pending payment')
    expect(payment('settled')).toBe('Settled')
    expect(payment('undone')).toBe('Undone')
  })

  describe('warnings with the source id (design D2, D7)', () => {
    const undated = {
      code: 'undated_adjustment' as const,
      transactionId: '40711',
      sheetId: '2d4e6f80-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
      rowNo: 7,
      feeSkipped: true,
    }
    const variant = { code: 'fee_variant_not_applied' as const, feeId: '0b8e1c2d-3e4f-4a5b-9c6d-7e8f9a0b1c2d' }

    it('writes an undated_adjustment with the source id of its transaction, never the internal id', () => {
      const body = summarize(batchCleanView({ warnings: [undated, variant] }), new Map([['40711', '911545598812004']]))
      expect(block(body, 'Code,Transaction ID,Detail').slice(1)).toEqual([
        'undated_adjustment,911545598812004,Row 7; fee skipped',
        'fee_variant_not_applied,,Fee 0b8e1c2d-3e4f-4a5b-9c6d-7e8f9a0b1c2d',
      ])
      expect(body).not.toContain(',40711,')
    })

    it('writes a UUID source id as it is', () => {
      const uuid = 'df14616d-4b26-4ffb-9984-72717ebff6a6'
      const body = summarize(batchCleanView({ warnings: [undated] }), new Map([['40711', uuid]]))
      expect(block(body, 'Code,Transaction ID,Detail')[1]).toBe(`undated_adjustment,${uuid},Row 7; fee skipped`)
    })

    it('fails instead of writing a warning whose transaction has no source id', () => {
      expect(() => summarize(batchCleanView({ warnings: [undated] }))).toThrow(/40711/)
    })
  })

  it('lists the transactions its warnings need translated', () => {
    const undated = {
      code: 'undated_adjustment' as const,
      transactionId: '40711',
      sheetId: '2d4e6f80-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
      rowNo: 7,
      feeSkipped: false,
    }
    const released = { ...undated, code: 'reserve_already_released' as const, transactionId: '40712' }
    const view = batchCleanView({ warnings: [undated, released, { ...undated, rowNo: 8 }] })
    expect(warningTransactionIds(view)).toEqual(['40711', '40712'])
    expect(warningTransactionIds(batchCleanView())).toEqual([])
  })

  it('does not convert money to a number', () => {
    const view = batchCleanView({ amountPayable: '123456789012345.1234' })
    expect(block(summarize(view), 'Line,Sign,Amount').at(-1)).toBe('Amount payable,,123456789012345.1234')
  })
})

describe('formula injection in the summary (design D7)', () => {
  const fee = (description: string | null, amount = '25.0000') => {
    const view = batchCleanView()
    return { ...view.batchFees[0]!, description, amount }
  }
  const feeLine = (view: SettlementView) => block(summarize(view), 'Fee type,Description,Source,Amount,Entered by')[1]

  it('neutralizes a description that Excel would run as a formula, keeping the CSV quoting', () => {
    const view = batchCleanView({ batchFees: [fee('=HYPERLINK("http://example.test","click")')] })
    expect(feeLine(view)).toBe(`Wire Fee,"'=HYPERLINK(""http://example.test"",""click"")",file,25.0000,analyst`)
  })

  it('neutralizes every text cell that starts with =, +, -, @, tab or carriage return', () => {
    for (const lead of ['=', '+', '-', '@', '\t', '\r']) {
      const line = feeLine(batchCleanView({ batchFees: [fee(`${lead}1+1`)] }))
      expect(line.split(',')[1], JSON.stringify(lead)).toMatch(/^"?'/)
    }
  })

  it('neutralizes the account, user, channel, brand and fee title texts', () => {
    const view = batchCleanView({
      accountName: '+Account',
      approvedBy: { userId: 2, userName: '@analyst' },
      channels: ['-RAM-01'],
      brandTotals: [{ cardBrand: '=VISA', qty: 1, amount: '100.0000' }],
      batchFees: [{ ...fee('Wire Fee'), title: '-Wire Fee', enteredBy: { userId: 2, userName: '=analyst' } }],
    })
    const body = summarize(view)
    expect(fieldValue(body, 'Account')).toBe("'+Account")
    expect(fieldValue(body, 'Processed by')).toBe("'@analyst")
    expect(fieldValue(body, 'Channels')).toBe("'-RAM-01")
    expect(block(body, 'Card brand,Qty,Amount')[1]).toBe("'=VISA,1,100.0000")
    expect(feeLine(view)).toBe("'-Wire Fee,Wire Fee,file,25.0000,'=analyst")
  })

  it('leaves a plain text, a negative amount and the figures untouched', () => {
    const view = batchCleanView({ batchFees: [fee('Wire fee refund', '-25.0000')], amountPayable: '-10.0000' })
    expect(feeLine(view)).toBe('Wire Fee,Wire fee refund,file,-25.0000,analyst')
    expect(block(summarize(view), 'Line,Sign,Amount').at(-1)).toBe('Amount payable,,-10.0000')
  })
})
