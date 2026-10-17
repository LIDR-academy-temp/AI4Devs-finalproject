import { describe, expect, it } from 'vitest'
import type { ColumnProposalResult, SheetProposalResult } from '../../matching/domain/propose-mapping.js'
import { RULES_FOR_PROVIDER_A } from '../application/__fakes__/in-memory.js'
import { assessReadiness, type ReadinessSheet } from './readiness.js'
import type { ColumnStats } from './workbook.js'

const STATUSES = RULES_FOR_PROVIDER_A.statuses
const SHEET_ID = '2b3c4d5e-6f70-4a8b-9c0d-1e2f3a4b5c6d'

const column = (
  sourceColumn: string,
  targetField: ColumnProposalResult['targetField'],
  extra?: Partial<ColumnProposalResult>,
): ColumnProposalResult => ({
  sourceColumn,
  targetField,
  source: targetField === null ? 'none' : 'global',
  ...extra,
})
const stat = (overrides?: Partial<ColumnStats>): ColumnStats => ({
  distinctValues: [],
  numericCells: 0,
  lossyNumericCells: 0,
  ...overrides,
})
const TEMPLATE_COLUMNS = [column('ID', 'transactionId'), column('Amount', 'amount'), column('Currency', 'currency')]

function transactions(
  name: string,
  cycle: 'E' | 'I' | 'R',
  statusId: number | null,
  overrides: Partial<ReadinessSheet> = {},
): ReadinessSheet {
  const proposed: SheetProposalResult = {
    kind: 'transactions',
    cycle,
    statusId,
    statusName: STATUSES.find((s) => s.statusId === statusId)?.name ?? null,
    source: 'global',
  }
  return {
    sheetId: SHEET_ID,
    sheetName: name,
    hidden: false,
    rowCount: 10,
    proposed,
    columns: TEMPLATE_COLUMNS,
    columnStats: [
      stat({ distinctValues: null }),
      stat({ distinctValues: null, numericCells: 10 }),
      stat({ distinctValues: ['USD'] }),
    ],
    ...overrides,
  }
}

function ignored(name: string, hidden = false): ReadinessSheet {
  return {
    sheetId: SHEET_ID,
    sheetName: name,
    hidden,
    rowCount: hidden ? 21 : 0,
    proposed: {
      kind: 'ignore',
      cycle: null,
      statusId: null,
      statusName: null,
      source: 'global',
      note: `Sheet "${name}" is ignored by rule "${name}"`,
    },
    columns: [],
    columnStats: [],
  }
}

function batchFees(columns: ColumnProposalResult[]): ReadinessSheet {
  return {
    sheetId: SHEET_ID,
    sheetName: 'Other Fees',
    hidden: false,
    rowCount: 2,
    proposed: { kind: 'batch_fees', cycle: null, statusId: null, statusName: null, source: 'global' },
    columns,
    columnStats: columns.map(() => stat()),
  }
}

const TEMPLATE: ReadinessSheet[] = [
  transactions('APP', 'E', 2),
  transactions('DEC', 'E', 3),
  transactions('CHB', 'I', 4),
  transactions('REF', 'I', 5),
  transactions('RDR', 'I', 6),
  transactions('RR', 'R', null),
  ignored('Duplicate Corrections'),
  ignored('CHB Alerts'),
  batchFees([column('Type of Fee', 'feeType'), column('Amount', 'amount'), column('Currency', 'currency')]),
  ignored('Settings', true),
]

const messagesOf = (items: { sheetName: string | null; message: string }[]) =>
  items.map((i) => `${i.sheetName}: ${i.message}`)

describe('assessReadiness on the standard template', () => {
  const readiness = assessReadiness(TEMPLATE, STATUSES)

  it('can analyze with nothing missing', () => {
    expect(readiness.canAnalyze).toBe(true)
    expect(readiness.missing).toEqual([])
  })

  it('notes the three ignored sheets, the hidden one and the DEC range that will open', () => {
    const notes = messagesOf(readiness.notes)
    expect(notes.filter((n) => n.includes('ignored'))).toHaveLength(3)
    expect(notes.some((n) => n.startsWith('Settings:') && n.includes('hidden'))).toBe(true)
    expect(notes.some((n) => n.startsWith('DEC:') && n.includes('Declined') && n.includes('DEC'))).toBe(true)
    for (const note of readiness.notes) expect(note.sheetId).toBe(SHEET_ID)
  })
})

describe('assessReadiness: what blocks the analysis', () => {
  it('names a transactions sheet without a transactionId column', () => {
    const app = transactions('APP', 'E', 2, {
      columns: [column('Reference', null), column('Amount', 'amount'), column('Currency', 'currency')],
    })

    const readiness = assessReadiness([app], STATUSES)

    expect(readiness.canAnalyze).toBe(false)
    expect(readiness.missing).toEqual([
      { sheetId: SHEET_ID, sheetName: 'APP', message: expect.stringContaining('transactionId') },
    ])
  })

  it('names a cycle E or I sheet with neither a fixed status nor a status column, but not a cycle R sheet', () => {
    const cb = transactions('CB', 'I', null, {
      columns: [column('Merchant Order No#', 'transactionId'), column('Amount USD', 'amount')],
    })
    const rr = transactions('RR', 'R', null)

    const readiness = assessReadiness([cb, rr], STATUSES)

    expect(readiness.canAnalyze).toBe(false)
    expect(messagesOf(readiness.missing)).toEqual([expect.stringMatching(/^CB: .*status/)])
  })

  it('accepts a status column instead of a fixed status', () => {
    const trx = transactions('TRX', 'E', null, {
      columns: [
        column('Merchant Order No#', 'transactionId'),
        column('Order Status', 'status', {
          statusValues: [{ value: 'Successful', statusId: 2, statusName: 'Successful', excludeAmount: false }],
        }),
        column('Amount USD', 'amount'),
      ],
      columnStats: [
        stat({ distinctValues: null }),
        stat({ distinctValues: ['Successful'] }),
        stat({ distinctValues: null }),
      ],
    })

    expect(assessReadiness([trx], STATUSES).missing).toEqual([])
  })

  it('names a sheet without proposal and asks to classify it', () => {
    const bonus: ReadinessSheet = {
      sheetId: SHEET_ID,
      sheetName: 'Bonus',
      hidden: false,
      rowCount: 2,
      proposed: { kind: null, cycle: null, statusId: null, statusName: null, source: 'none' },
      columns: [column('Reference', null), column('Importe', null)],
      columnStats: [stat(), stat()],
    }

    const readiness = assessReadiness([...TEMPLATE, bonus], STATUSES)

    expect(readiness.canAnalyze).toBe(false)
    expect(messagesOf(readiness.missing)).toEqual([expect.stringMatching(/^Bonus: .*(transactions|batch_fees|ignore)/)])
  })

  it('blocks an import without any transactions sheet, and one without files', () => {
    const feesOnly = assessReadiness(
      [batchFees([column('Type of Fee', 'feeType'), column('Amount', 'amount')])],
      STATUSES,
    )
    expect(feesOnly.canAnalyze).toBe(false)
    expect(feesOnly.missing).toEqual([
      { sheetId: null, sheetName: null, message: expect.stringContaining('transactions') },
    ])

    const empty = assessReadiness([], STATUSES)
    expect(empty.canAnalyze).toBe(false)
    expect(empty.missing).toEqual([{ sheetId: null, sheetName: null, message: expect.stringContaining('file') }])
  })
})

describe('assessReadiness: what is worth reviewing', () => {
  it('notes status values without alias, without blocking', () => {
    const cb = transactions('CB', 'I', null, {
      columns: [
        column('Merchant Order No#', 'transactionId'),
        column('Order Status', 'status', {
          statusValues: [
            { value: 'Weird', statusId: null, statusName: null, excludeAmount: false },
            { value: 'CHB 2', statusId: 4, statusName: 'Chargeback', excludeAmount: true },
          ],
        }),
      ],
      columnStats: [stat({ distinctValues: null }), stat({ distinctValues: ['Weird', 'CHB 2'] })],
    })

    const readiness = assessReadiness([cb], STATUSES)

    expect(readiness.canAnalyze).toBe(true)
    expect(messagesOf(readiness.notes)).toEqual([expect.stringMatching(/^CB: .*"Weird".*alias/)])
  })

  it('notes a status whose natural cycle differs from the sheet cycle (README §3.2), without blocking', () => {
    const cb = transactions('CB', 'I', null, {
      columns: [
        column('Merchant Order No#', 'transactionId'),
        column('Order Status', 'status', {
          statusValues: [
            { value: 'CHB', statusId: 4, statusName: 'Chargeback', excludeAmount: false },
            { value: 'Successful', statusId: 2, statusName: 'Successful', excludeAmount: false },
          ],
        }),
      ],
      columnStats: [stat({ distinctValues: null }), stat({ distinctValues: ['CHB', 'Successful'] })],
    })

    const readiness = assessReadiness([cb], STATUSES)

    expect(readiness.canAnalyze).toBe(true)
    expect(messagesOf(readiness.notes)).toEqual([expect.stringMatching(/^CB: .*"Successful".*cycle E.*cycle I/)])
  })

  it('notes a status column with more distinct values than tracked', () => {
    const cb = transactions('CB', 'I', null, {
      columns: [column('Merchant Order No#', 'transactionId'), column('Order Status', 'status')],
      columnStats: [stat({ distinctValues: null }), stat({ distinctValues: null })],
    })

    expect(messagesOf(assessReadiness([cb], STATUSES).notes)).toEqual([expect.stringMatching(/^CB: .*distinct/)])
  })

  it('notes numeric ID cells that lost precision, with their count, without blocking', () => {
    const app = transactions('APP', 'E', 2, {
      columnStats: [
        stat({ distinctValues: null, numericCells: 10, lossyNumericCells: 2 }),
        stat({ distinctValues: null, numericCells: 10 }),
        stat({ distinctValues: ['USD'] }),
      ],
    })

    const readiness = assessReadiness([app], STATUSES)

    expect(readiness.canAnalyze).toBe(true)
    expect(messagesOf(readiness.notes)).toEqual([
      expect.stringMatching(/^APP: 2 .*(scientific notation|15 digits).*reject/),
    ])
  })

  it('notes a batch_fees sheet without feeType or amount: nothing will be prefilled', () => {
    const fees = batchFees([column('Fee', null), column('Amount', 'amount')])

    expect(messagesOf(assessReadiness([...TEMPLATE.slice(0, 6), fees], STATUSES).notes)).toContainEqual(
      expect.stringMatching(/^Other Fees: .*feeType.*prefilled/),
    )
  })

  it('notes an empty transactions sheet', () => {
    const app = transactions('APP', 'E', 2, { rowCount: 0 })

    expect(messagesOf(assessReadiness([app], STATUSES).notes)).toContainEqual(expect.stringMatching(/^APP: .*no rows/))
  })
})
