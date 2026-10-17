import { describe, expect, it } from 'vitest'
import { RULES_FOR_PROVIDER_A } from '../application/__fakes__/in-memory.js'
import { buildRowDraft, type RowContext, toNewImportRow } from './build-rows.js'
import type { TransactionRef } from './match-rows.js'
import type { SheetRow } from './workbook.js'

// Spec "Fila original de referencia", "Estado e importe por fila", "Importes positivos y moneda de referencia",
// "Filas sin ID se ignoran"; matching spec "Alias de estado globales", "Estado fijo por hoja frente a columna de
// estado", "Coherencia ciclo–estado" (design D5).
const SHEET_ID = '00000000-0000-4000-8000-000000000a01'
const rules = { aliases: RULES_FOR_PROVIDER_A.aliases, statuses: RULES_FOR_PROVIDER_A.statuses }

function context(overrides: Partial<RowContext> = {}): RowContext {
  return {
    sheetId: SHEET_ID,
    headers: ['ID', 'Amount', 'Currency'],
    kind: 'transactions',
    cycle: 'E',
    statusId: 2,
    columns: [
      { sourceColumn: 'ID', targetField: 'transactionId' },
      { sourceColumn: 'Amount', targetField: 'amount' },
      { sourceColumn: 'Currency', targetField: 'currency' },
    ],
    rules,
    ...overrides,
  }
}

function row(cells: string[], rowNo = 2, lossyNumeric: number[] = []): SheetRow {
  return { rowNo, cells, lossyNumeric }
}

const unmatched = {
  matchResult: 'unmatched' as const,
  transactionId: null,
  gatewayId: null,
  reason: 'no_match' as const,
  candidates: [],
  transaction: null,
}

describe('buildRowDraft', () => {
  it('keeps the whole row as rawData, the id cell as text and the sheet cycle', () => {
    const draft = buildRowDraft(row(['252570479111759', '16.22', 'USD']), context())

    expect(draft).toMatchObject({
      sheetId: SHEET_ID,
      rowNo: 2,
      transactionIdRaw: '252570479111759',
      idText: '252570479111759',
      idLossy: false,
      cycle: 'E',
      amount: '16.2200',
      currency: 'USD',
      statusRaw: null,
      statusId: 2,
      excludeAmount: false,
      warnings: [],
      rawData: { ID: '252570479111759', Amount: '16.22', Currency: 'USD' },
    })
  })

  it('rawData includes unmapped columns and deduplicated headers', () => {
    const ctx = context({ headers: ['ID', 'Amount', 'Amount (2)', 'Note'] })
    const draft = buildRowDraft(row(['1', '2', '3', 'hi']), ctx)

    expect(draft.rawData).toEqual({ ID: '1', Amount: '2', 'Amount (2)': '3', Note: 'hi' })
  })

  it('rounds the amount to four decimals and reports unreadable or negative amounts', () => {
    expect(buildRowDraft(row(['1', '72.09999999999999', 'USD']), context()).amount).toBe('72.1000')
    expect(buildRowDraft(row(['1', '16.22', 'USD']), context()).amount).toBe('16.2200')

    const unparsed = buildRowDraft(row(['1', '12,50', 'USD']), context())
    expect(unparsed.amount).toBeNull()
    expect(unparsed.warnings).toEqual(['amount_unparsed'])
    expect(unparsed.rawData.Amount).toBe('12,50')

    const negative = buildRowDraft(row(['1', '-430.62', 'USD']), context())
    expect(negative.amount).toBe('-430.6200')
    expect(negative.warnings).toEqual(['negative_amount'])

    const empty = buildRowDraft(row(['1', '', 'USD']), context())
    expect(empty.amount).toBeNull()
    expect(empty.warnings).toEqual([])
  })

  it('keeps the currency as three uppercase letters and warns on non-USD or invalid values', () => {
    expect(buildRowDraft(row(['1', '1', 'usd']), context())).toMatchObject({ currency: 'USD', warnings: [] })
    expect(buildRowDraft(row(['1', '1', 'EUR']), context())).toMatchObject({
      currency: 'EUR',
      warnings: ['non_usd_currency'],
    })
    expect(buildRowDraft(row(['1', '1', 'US']), context())).toMatchObject({
      currency: null,
      warnings: ['currency_invalid'],
    })
    const noColumn = context({ columns: [{ sourceColumn: 'ID', targetField: 'transactionId' }] })
    expect(buildRowDraft(row(['1', '1', 'US']), noColumn)).toMatchObject({ currency: null, amount: null, warnings: [] })
  })

  it('takes the status from the sheet when it is fixed (statusRaw stays null)', () => {
    const draft = buildRowDraft(row(['1', '1', 'USD']), context({ statusId: 3 }))

    expect(draft).toMatchObject({ statusId: 3, statusRaw: null, excludeAmount: false })
  })

  it('resolves the status column through the aliases when the sheet has no fixed status', () => {
    const ctx = context({
      headers: ['Merchant Order No#', 'Order Status', 'Amount USD'],
      cycle: 'I',
      statusId: null,
      columns: [
        { sourceColumn: 'Merchant Order No#', targetField: 'transactionId' },
        { sourceColumn: 'Order Status', targetField: 'status' },
        { sourceColumn: 'Amount USD', targetField: 'amount' },
      ],
    })

    expect(buildRowDraft(row(['df14616d-4b26-4ffb-9984-72717ebff6a6', 'CHB 2', '305.32']), ctx)).toMatchObject({
      statusRaw: 'CHB 2',
      statusId: 4,
      excludeAmount: true,
      warnings: [],
    })
    expect(buildRowDraft(row(['x', 'Failed', '1']), { ...ctx, cycle: 'E' })).toMatchObject({
      statusRaw: 'Failed',
      statusId: 3,
      warnings: [],
    })
    expect(buildRowDraft(row(['x', 'Weird', '1']), ctx)).toMatchObject({
      statusRaw: 'Weird',
      statusId: null,
      warnings: ['status_unresolved'],
    })
  })

  it('lets the fixed sheet status win over the status column and warns when they differ', () => {
    const ctx = context({
      headers: ['ID', 'Status', 'Amount'],
      statusId: 3,
      columns: [
        { sourceColumn: 'ID', targetField: 'transactionId' },
        { sourceColumn: 'Status', targetField: 'status' },
        { sourceColumn: 'Amount', targetField: 'amount' },
      ],
    })

    expect(buildRowDraft(row(['1', 'Failed', '1']), ctx)).toMatchObject({
      statusId: 3,
      statusRaw: 'Failed',
      warnings: [],
    })
    expect(buildRowDraft(row(['1', 'Successful', '1']), ctx)).toMatchObject({
      statusId: 3,
      statusRaw: 'Successful',
      warnings: ['status_differs_from_sheet'],
    })
  })

  it('warns when the resolved status belongs to the other cycle', () => {
    const ctx = context({
      headers: ['ID', 'Status', 'Amount'],
      cycle: 'I',
      statusId: null,
      columns: [
        { sourceColumn: 'ID', targetField: 'transactionId' },
        { sourceColumn: 'Status', targetField: 'status' },
      ],
    })

    expect(buildRowDraft(row(['1', 'Successful', '1']), ctx).warnings).toEqual(['cycle_mismatch'])
    expect(buildRowDraft(row(['1', 'CHB', '1']), ctx).warnings).toEqual([])
  })

  it('leaves the status open on an R sheet (it comes from the matched transaction)', () => {
    expect(buildRowDraft(row(['1', '2.27', 'USD']), context({ cycle: 'R', statusId: null }))).toMatchObject({
      statusId: null,
      statusRaw: null,
      warnings: [],
    })
  })

  it('truncates what the columns cannot hold while rawData keeps the full text', () => {
    const longId = '9'.repeat(120)
    const longStatus = 's'.repeat(60)
    const ctx = context({
      headers: ['ID', 'Status', 'Amount'],
      statusId: null,
      columns: [
        { sourceColumn: 'ID', targetField: 'transactionId' },
        { sourceColumn: 'Status', targetField: 'status' },
      ],
    })

    const draft = buildRowDraft(row([longId, longStatus, '1']), ctx)

    expect(draft.transactionIdRaw).toBe('9'.repeat(100))
    expect(draft.idText).toBe(longId)
    expect(draft.statusRaw).toBe('s'.repeat(50))
    expect(draft.rawData.ID).toBe(longId)
  })

  it('marks the id cell that lost precision', () => {
    expect(buildRowDraft(row(['12345678901234567', '1', 'USD'], 7, [0]), context())).toMatchObject({
      rowNo: 7,
      idText: '12345678901234567',
      idLossy: true,
    })
    expect(buildRowDraft(row(['1', '72.09999999999999', 'USD'], 7, [1]), context()).idLossy).toBe(false)
  })
})

describe('toNewImportRow', () => {
  const draft = buildRowDraft(row(['252570479111759', '16.22', 'USD']), context())

  it('writes a matched row with the transaction ids and a null detailJson when there is nothing to say', () => {
    const transaction: TransactionRef = {
      transactionId: 42n,
      gatewayId: 1,
      gatewayName: 'Gateway Numeric',
      sourceTransactionId: '252570479111759',
      channelId: 1001,
      channelName: 'RAM-01',
      providerId: 101,
      statusId: 2,
      statusName: 'Successful',
      amount: '16.2200',
      transactionDate: new Date('2026-10-01T00:00:00.000Z'),
    }

    const stored = toNewImportRow(draft, {
      matchResult: 'matched',
      transactionId: 42n,
      gatewayId: 1,
      reason: null,
      candidates: [],
      transaction,
    })

    expect(stored).toEqual({
      sheetId: SHEET_ID,
      rowNo: 2,
      transactionIdRaw: '252570479111759',
      transactionId: 42n,
      gatewayId: 1,
      statusRaw: null,
      statusId: 2,
      cycle: 'E',
      amount: '16.2200',
      currency: 'USD',
      txnDate: null,
      feeTypeRaw: null,
      rawData: JSON.stringify({ ID: '252570479111759', Amount: '16.22', Currency: 'USD' }),
      ignore: false,
      matchResult: 'matched',
      detailJson: null,
    })
  })

  it('an R row takes the current status of the matched transaction', () => {
    const rDraft = buildRowDraft(row(['252570479111759', '2.27', 'USD']), context({ cycle: 'R', statusId: null }))
    const transaction = { transactionId: 42n, gatewayId: 1, statusId: 4 } as TransactionRef

    const stored = toNewImportRow(rDraft, {
      matchResult: 'matched',
      transactionId: 42n,
      gatewayId: 1,
      reason: null,
      candidates: [],
      transaction,
    })

    expect(stored).toMatchObject({ cycle: 'R', statusId: 4, statusRaw: null })
  })

  it('writes reason, warnings and excludeAmount into detailJson', () => {
    const chb2 = buildRowDraft(
      row(['x', 'CHB 2', '-1']),
      context({
        headers: ['ID', 'Status', 'Amount'],
        cycle: 'I',
        statusId: null,
        columns: [
          { sourceColumn: 'ID', targetField: 'transactionId' },
          { sourceColumn: 'Status', targetField: 'status' },
          { sourceColumn: 'Amount', targetField: 'amount' },
        ],
      }),
    )

    const stored = toNewImportRow(chb2, unmatched)

    expect(stored).toMatchObject({ matchResult: 'unmatched', transactionId: null, gatewayId: null, statusId: 4 })
    expect(JSON.parse(stored.detailJson ?? 'null')).toEqual({
      reason: 'no_match',
      warnings: ['negative_amount'],
      excludeAmount: true,
    })
  })

  it('writes an ignored row for an empty id', () => {
    const empty = buildRowDraft(row(['', '', '']), context())

    const stored = toNewImportRow(empty, { matchResult: 'ignored', reason: 'empty_id' })

    expect(stored).toMatchObject({
      transactionIdRaw: '',
      transactionId: null,
      matchResult: 'ignored',
      ignore: true,
      amount: null,
      currency: null,
    })
    expect(JSON.parse(stored.detailJson ?? 'null')).toEqual({ reason: 'empty_id' })
  })

  it('writes an unmatched row with its reason and the candidates of an ambiguous one', () => {
    const lossy = toNewImportRow(buildRowDraft(row(['12345678901234567', '1', 'USD'], 2, [0]), context()), {
      matchResult: 'unmatched',
      reason: 'lossy_numeric_id',
    })
    expect(lossy).toMatchObject({ matchResult: 'unmatched', ignore: false, transactionIdRaw: '12345678901234567' })
    expect(JSON.parse(lossy.detailJson ?? 'null')).toEqual({
      reason: 'lossy_numeric_id',
      warnings: ['lossy_numeric_id'],
    })

    const candidates = [
      {
        gatewayId: 1,
        gatewayName: 'G1',
        transactionId: '1',
        channelId: 1001,
        channelName: 'RAM-01',
        statusId: 2,
        statusName: 'Successful',
        amount: '1.0000',
      },
      {
        gatewayId: 9001,
        gatewayName: 'G2',
        transactionId: '2',
        channelId: 9001,
        channelName: 'RAM-T1',
        statusId: 2,
        statusName: 'Successful',
        amount: '1.0000',
      },
    ]
    const ambiguous = toNewImportRow(draft, {
      matchResult: 'ambiguous',
      transactionId: null,
      gatewayId: null,
      reason: null,
      candidates,
      transaction: null,
    })
    expect(ambiguous).toMatchObject({ matchResult: 'ambiguous', transactionId: null, gatewayId: null })
    expect(JSON.parse(ambiguous.detailJson ?? 'null')).toEqual({ candidates })
  })
})
