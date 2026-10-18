import { describe, expect, it } from 'vitest'
import { movement, row, STATUS, STATUSES } from '../test-support/builders.js'
import { compareCurrent, compareHistory, conflictKey, relation } from './conflict-key.js'
import { createStatusCatalog } from './status-catalog.js'

// Duplicate / collision key `(transactionId, cycle)`, order of occurrences (question 13) and the CHB 2 exception
// (question 7), design D5–D6.
const catalog = createStatusCatalog(STATUSES)

describe('conflictKey', () => {
  it('joins transactionId and cycle with a colon', () => {
    expect(conflictKey(441706751475644n, 'E')).toBe('441706751475644:E')
    expect(conflictKey(1n, 'R')).not.toBe(conflictKey(1n, 'E'))
  })
})

describe('compareCurrent', () => {
  it('orders current occurrences by fileOrder, then sheetOrder, then rowNo', () => {
    const late = row({ fileOrder: 1, sheetOrder: 0, rowNo: 2 })
    const secondSheet = row({ fileOrder: 0, sheetOrder: 1, rowNo: 2 })
    const lowRow = row({ fileOrder: 0, sheetOrder: 0, rowNo: 5 })
    const first = row({ fileOrder: 0, sheetOrder: 0, rowNo: 3 })

    expect([late, secondSheet, lowRow, first].sort(compareCurrent)).toEqual([first, lowRow, secondSheet, late])
  })
})

describe('compareHistory', () => {
  it('orders historical occurrences by batchNo, then attemptNo, then rowNo', () => {
    const b51 = movement({ batchNo: 51, attemptNo: 1, rowNo: 1 })
    const b50a2 = movement({ batchNo: 50, attemptNo: 2, rowNo: 1 })
    const b50a1r9 = movement({ batchNo: 50, attemptNo: 1, rowNo: 9 })
    const b50a1r3 = movement({ batchNo: 50, attemptNo: 1, rowNo: 3 })

    expect([b51, b50a2, b50a1r9, b50a1r3].sort(compareHistory)).toEqual([b50a1r3, b50a1r9, b50a2, b51])
  })
})

describe('relation', () => {
  const chb = { statusId: STATUS.Chargeback, excludeAmount: false }
  const chb2 = { statusId: STATUS.Chargeback, excludeAmount: true }
  const refund = { statusId: STATUS.Refund, excludeAmount: false }

  it('same status and excludeAmount → same', () => {
    expect(relation(chb, { ...chb }, catalog)).toBe('same')
    expect(relation(chb2, chb2, catalog)).toBe('same')
  })

  it('Chargeback against Chargeback with excludeAmount (CHB 2) → compatible, either way round', () => {
    expect(relation(chb, chb2, catalog)).toBe('compatible')
    expect(relation(chb2, chb, catalog)).toBe('compatible')
  })

  it('any other difference → different', () => {
    expect(relation(chb2, refund, catalog)).toBe('different')
    expect(relation(chb, refund, catalog)).toBe('different')
    expect(
      relation(
        { statusId: STATUS.Successful, excludeAmount: false },
        { statusId: STATUS.Declined, excludeAmount: false },
        catalog,
      ),
    ).toBe('different')
  })
})
