import { describe, expect, it } from 'vitest'
import { row, SHEET, txn } from '../test-support/builders.js'
import { classifyRows } from './inclusion.js'

// Spec settlement "Inclusión de las apariciones al procesar" and "Filas que no se procesan" (design D8, D9).
const keys = (rows: { rowNo: number }[]) => rows.map((r) => r.rowNo)
const zero = { ignored: 0, unmatched: 0, ambiguous: 0, excluded: 0, unresolvedStatus: 0, pending: 0 }

describe('combining the inclusions of a row (AND)', () => {
  it('processes a row without occurrences', () => {
    const { processed, skipped } = classifyRows([row(2)], [])

    expect(keys(processed)).toEqual([2])
    expect(skipped).toEqual(zero)
  })

  it('excludes a row included in one finding and excluded in another (spec scenario)', () => {
    const inclusions = [
      { sheetId: SHEET, rowNo: 2, includeInSettlement: true }, // first occurrence of a duplicate in_batch
      { sheetId: SHEET, rowNo: 2, includeInSettlement: false }, // current occurrence of a duplicate across_batches
    ]

    const { processed, skipped } = classifyRows([row(2)], inclusions)

    expect(processed).toEqual([])
    expect(skipped).toEqual({ ...zero, excluded: 1 })
  })

  it('respects a duplicate included by hand that is in no other finding', () => {
    const same = txn({ transactionId: 7n })
    const inclusions = [
      { sheetId: SHEET, rowNo: 2, includeInSettlement: true },
      { sheetId: SHEET, rowNo: 3, includeInSettlement: true }, // second occurrence, included by hand
    ]

    expect(keys(classifyRows([row(2, {}, same), row(3, {}, same)], inclusions).processed)).toEqual([2, 3])
  })

  it('processes every occurrence of a collision included by default (APP and DEC)', () => {
    const same = txn({ transactionId: 7n })
    const rows = [row(2, {}, same), row(3, { sheetId: 'dec', statusCode: 'Declined' }, same)]
    const inclusions = [
      { sheetId: SHEET, rowNo: 2, includeInSettlement: true },
      { sheetId: 'dec', rowNo: 3, includeInSettlement: true },
    ]

    expect(classifyRows(rows, inclusions).processed.map((r) => r.statusCode)).toEqual(['Successful', 'Declined'])
  })
})

describe('rows that are not processed, each counted once under its reason', () => {
  it('counts ignored, unmatched and ambiguous rows', () => {
    const rows = [
      row(2, { matchResult: 'ignored' }, null),
      row(3, { ignore: true }),
      row(4, {}, null),
      row(5, { matchResult: 'ambiguous' }, null),
    ]

    expect(classifyRows(rows, []).skipped).toEqual({ ...zero, ignored: 2, unmatched: 1, ambiguous: 1 })
  })

  it('does not process an E or I row whose status could not be resolved', () => {
    const rows = [row(2, { statusCode: null }), row(3, { cycle: 'I', statusCode: null })]

    const { processed, skipped } = classifyRows(rows, [])

    expect(processed).toEqual([])
    expect(skipped).toEqual({ ...zero, unresolvedStatus: 2 })
  })

  it('does not process a row whose own status is Pending', () => {
    expect(classifyRows([row(2, { statusCode: 'Pending' })], []).skipped).toEqual({ ...zero, pending: 1 })
  })

  it('processes an APP row whose transaction is Pending in the gateway, with the status of the row (gate decision)', () => {
    const pending = txn({ transactionId: 9n, statusCode: 'Pending' })

    const { processed, skipped } = classifyRows([row(2, {}, pending)], [])

    expect(processed.map((r) => r.statusCode)).toEqual(['Successful'])
    expect(skipped).toEqual(zero)
  })

  it('an R row needs no resolved status (the reserve has none)', () => {
    expect(keys(classifyRows([row(2, { cycle: 'R', statusCode: null })], []).processed)).toEqual([2])
  })

  it('an excluded row is counted as excluded even if its status is not resolved', () => {
    const inclusions = [{ sheetId: SHEET, rowNo: 2, includeInSettlement: false }]

    expect(classifyRows([row(2, { statusCode: null })], inclusions).skipped).toEqual({ ...zero, excluded: 1 })
  })
})

describe('order of the processed rows', () => {
  it('is the first-appearance order: file, sheet position, row, then file and sheet ids', () => {
    const rows = [row(5, { fileOrder: 1 }), row(9, { sheetOrder: 1 }), row(3), row(2, { fileOrder: 1, sheetOrder: 0 })]

    expect(classifyRows(rows, []).processed.map((r) => [r.fileOrder, r.sheetOrder, r.rowNo])).toEqual([
      [0, 0, 3],
      [0, 1, 9],
      [1, 0, 2],
      [1, 0, 5],
    ])
  })
})
