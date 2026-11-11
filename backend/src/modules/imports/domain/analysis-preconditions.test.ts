import { describe, expect, it } from 'vitest'
import { RULES_FOR_PROVIDER_A } from '../application/__fakes__/in-memory.js'
import { analysisPreconditions, assertImportSize, type PreconditionSheet } from './analysis-preconditions.js'
import { ImportTooLargeError } from './errors.js'

// Spec "Precondiciones del análisis" and "Límite de filas por import" (design D6, D1 point 4).
const statuses = RULES_FOR_PROVIDER_A.statuses
const TEMPLATE = [
  { sourceColumn: 'ID', targetField: 'transactionId' as const },
  { sourceColumn: 'Amount', targetField: 'amount' as const },
  { sourceColumn: 'Currency', targetField: 'currency' as const },
]

function sheet(overrides: Partial<PreconditionSheet> & { sheetName: string }): PreconditionSheet {
  return {
    sheetId: `00000000-0000-4000-8000-${overrides.sheetName
      .padStart(12, '0')
      .replace(/[^0-9a-f]/gi, '0')
      .toLowerCase()}`,
    mappingConfirmed: true,
    kind: 'transactions',
    cycle: 'E',
    statusId: 2,
    columns: TEMPLATE,
    rowCount: 10,
    ...overrides,
  }
}

const APP = sheet({ sheetName: 'APP' })
const DEC = sheet({ sheetName: 'DEC', statusId: 3 })
const RR = sheet({ sheetName: 'RR', cycle: 'R', statusId: null })
const FEES = sheet({
  sheetName: 'Other Fees',
  kind: 'batch_fees',
  cycle: null,
  statusId: null,
  columns: [],
  rowCount: 2,
})
const IGNORED = sheet({ sheetName: 'Settings', kind: 'ignore', cycle: null, statusId: null, columns: [], rowCount: 21 })

describe('analysisPreconditions', () => {
  it('returns nothing for the confirmed template', () => {
    expect(analysisPreconditions([APP, DEC, RR, FEES, IGNORED], statuses)).toEqual([])
  })

  it('names an unconfirmed sheet with field confirmation', () => {
    const items = analysisPreconditions([APP, { ...DEC, mappingConfirmed: false }], statuses)

    expect(items).toEqual([
      {
        sheetId: DEC.sheetId,
        sheetName: 'DEC',
        field: 'confirmation',
        message: expect.stringMatching(/not confirmed/),
      },
    ])
  })

  it('requires at least one transactions sheet', () => {
    expect(analysisPreconditions([FEES, IGNORED], statuses)).toEqual([
      { sheetId: null, sheetName: null, field: 'transactions', message: expect.any(String) },
    ])
  })

  it('names a transactions sheet without transactionId and an E/I sheet without any status', () => {
    const noId = { ...APP, columns: TEMPLATE.slice(1) }
    const cb = sheet({
      sheetName: 'CB',
      cycle: 'I',
      statusId: null,
      columns: [{ sourceColumn: 'Merchant Order No#', targetField: 'transactionId' }],
    })

    expect(analysisPreconditions([noId, cb, RR], statuses)).toEqual([
      { sheetId: APP.sheetId, sheetName: 'APP', field: 'transactionId', message: expect.any(String) },
      { sheetId: cb.sheetId, sheetName: 'CB', field: 'status', message: expect.any(String) },
    ])
  })

  it('accepts the status through a column and never asks R for a status', () => {
    const cb = sheet({
      sheetName: 'CB',
      cycle: 'I',
      statusId: null,
      columns: [
        { sourceColumn: 'Merchant Order No#', targetField: 'transactionId' },
        { sourceColumn: 'Order Status', targetField: 'status' },
      ],
    })

    expect(analysisPreconditions([cb, RR], statuses)).toEqual([])
  })

  it('lists several shortcomings in sheet order, confirmation first for each sheet', () => {
    const noId = { ...APP, columns: TEMPLATE.slice(1) }
    const unconfirmedNoStatus = sheet({
      sheetName: 'CB',
      cycle: 'I',
      statusId: null,
      mappingConfirmed: false,
      columns: [TEMPLATE[0]!],
    })

    expect(analysisPreconditions([noId, unconfirmedNoStatus], statuses).map((m) => [m.sheetName, m.field])).toEqual([
      ['APP', 'transactionId'],
      ['CB', 'confirmation'],
    ])
  })

  it('a sheet without kind (no proposal, unconfirmed) is reported once, as confirmation', () => {
    const bonus = sheet({
      sheetName: 'Bonus',
      kind: null,
      cycle: null,
      statusId: null,
      columns: [],
      mappingConfirmed: false,
    })

    expect(analysisPreconditions([APP, bonus], statuses).map((m) => m.field)).toEqual(['confirmation'])
  })
})

describe('assertImportSize', () => {
  it('passes exactly at the limit, counting only the transactions sheets', () => {
    const big = { ...APP, rowCount: 90_000 }
    const alsoBig = { ...DEC, rowCount: 10_000 }
    const fees = { ...FEES, rowCount: 5_000 }
    const ignored = { ...IGNORED, rowCount: 15_000 }

    expect(() => assertImportSize([big, alsoBig, fees, ignored], { maxRowsPerImport: 100_000 })).not.toThrow()
  })

  it('rejects one row over the limit with rows and limit in the details', () => {
    const big = { ...APP, rowCount: 90_000 }
    const over = { ...DEC, rowCount: 10_001 }

    try {
      assertImportSize([big, over], { maxRowsPerImport: 100_000 })
      expect.fail('should throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ImportTooLargeError)
      expect((error as ImportTooLargeError).details).toEqual({ rows: 100_001, limit: 100_000 })
    }
  })
})
