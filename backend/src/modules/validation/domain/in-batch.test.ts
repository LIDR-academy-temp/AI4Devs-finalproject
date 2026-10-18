import { describe, expect, it } from 'vitest'
import { input, resultOf, row, STATUS } from '../test-support/builders.js'
import { sampleInput } from '../test-support/sample-input.js'
import { runValidations } from './run-validations.js'
import type { ValidationRow } from './types.js'

// Spec "Clave de duplicado y colisión", "Colisiones permitidas y CHB 2" and "Grupos de tres o más apariciones"
// (design D5, D6; questions 5, 7 and 13).
const run = (rows: ValidationRow[]) => {
  const report = runValidations(input({ rows }))
  return { dup: resultOf(report, 'duplicate_in_batch'), col: resultOf(report, 'status_collision_in_batch') }
}
const included = (issue: { occurrences: { defaultIncluded: boolean }[] }) =>
  issue.occurrences.map((o) => o.defaultIncluded)

describe('duplicate_in_batch and status_collision_in_batch', () => {
  it('batch-issues: the APP duplicate (first included) and the APP/DEC collision (both included)', async () => {
    const report = runValidations((await sampleInput('batch-issues')).input)
    const dup = resultOf(report, 'duplicate_in_batch')
    const col = resultOf(report, 'status_collision_in_batch')

    expect(dup).toMatchObject({ outcome: 'warning', issueCount: 1 })
    expect(dup.issues[0]).toMatchObject({
      issueType: 'duplicate',
      scope: 'in_batch',
      blocking: false,
      transactionIdRaw: '441706751475644',
      cycle: 'E',
    })
    expect(dup.issues[0]?.occurrences.map((o) => o.sourceType)).toEqual(['current_import', 'current_import'])
    expect(included(dup.issues[0]!)).toEqual([true, false])

    expect(col).toMatchObject({ outcome: 'warning', issueCount: 1 })
    expect(col.issues[0]).toMatchObject({
      issueType: 'collision',
      scope: 'in_batch',
      transactionIdRaw: '911545593909470',
    })
    expect(col.issues[0]?.occurrences.map((o) => o.statusId)).toEqual([STATUS.Successful, STATUS.Declined])
    expect(included(col.issues[0]!)).toEqual([true, true])
  })

  it.each(['batch-clean', 'legacy-provider'] as const)('%s: both passed', async (name) => {
    const report = runValidations((await sampleInput(name)).input)

    expect(resultOf(report, 'duplicate_in_batch').outcome).toBe('passed')
    expect(resultOf(report, 'status_collision_in_batch').outcome).toBe('passed')
  })

  it('E and R of the same transaction are not compared', () => {
    const { dup, col } = run([row({ cycle: 'E' }), row({ cycle: 'R', status: 'Successful' })])

    expect(dup.issues).toEqual([])
    expect(col.issues).toEqual([])
  })

  it('Refund + Chargeback of the same movement in I: a non-blocking collision with both included', () => {
    const { dup, col } = run([
      row({ cycle: 'I', status: 'Refund', gateway: 'Refund' }),
      row({ cycle: 'I', status: 'Chargeback', gateway: 'Refund' }),
    ])

    expect(dup.issues).toEqual([])
    expect(col.outcome).toBe('warning')
    expect(col.issues[0]).toMatchObject({ issueType: 'collision', cycle: 'I', blocking: false })
    expect(included(col.issues[0]!)).toEqual([true, true])
  })

  it('CHB + CHB 2 of the same movement: nothing (question 7)', () => {
    const { dup, col } = run([
      row({ cycle: 'I', status: 'Chargeback', gateway: 'Chargeback' }),
      row({ cycle: 'I', status: 'Chargeback', gateway: 'Chargeback', excludeAmount: true }),
    ])

    expect(dup.issues).toEqual([])
    expect(col.issues).toEqual([])
  })

  it('two CHB 2 of the same movement: a duplicate', () => {
    const { dup, col } = run([
      row({ cycle: 'I', status: 'Chargeback', gateway: 'Chargeback', excludeAmount: true }),
      row({ cycle: 'I', status: 'Chargeback', gateway: 'Chargeback', excludeAmount: true }),
    ])

    expect(dup.issueCount).toBe(1)
    expect(dup.issues[0]?.occurrences.every((o) => o.excludeAmount)).toBe(true)
    expect(col.issues).toEqual([])
  })

  it('CHB 2 + Refund of the same movement: a collision', () => {
    const { dup, col } = run([
      row({ cycle: 'I', status: 'Chargeback', gateway: 'Refund', excludeAmount: true }),
      row({ cycle: 'I', status: 'Refund', gateway: 'Refund' }),
    ])

    expect(dup.issues).toEqual([])
    expect(col.issueCount).toBe(1)
  })

  it('CHB + CHB 2 + Refund of the same movement: one collision listing all three occurrences (M2)', () => {
    const { dup, col } = run([
      row({ cycle: 'I', status: 'Chargeback', gateway: 'Refund', rowNo: 2 }),
      row({ cycle: 'I', status: 'Chargeback', gateway: 'Refund', excludeAmount: true, rowNo: 3 }),
      row({ cycle: 'I', status: 'Refund', gateway: 'Refund', rowNo: 4 }),
    ])

    expect(dup.issues).toEqual([])
    expect(col.issueCount).toBe(1)
    expect(col.issues[0]!.occurrences.map((o) => [o.statusId, o.excludeAmount, o.defaultIncluded])).toEqual([
      [STATUS.Chargeback, false, true],
      [STATUS.Chargeback, true, true],
      [STATUS.Refund, false, true],
    ])
  })

  it('APP, APP, DEC: one duplicate (second Successful excluded) and one collision (first Successful and the Declined)', () => {
    const { dup, col } = run([
      row({ sheetId: 'APP', sheetOrder: 0, rowNo: 2 }),
      row({ sheetId: 'APP', sheetOrder: 0, rowNo: 7 }),
      row({ sheetId: 'DEC', sheetOrder: 1, rowNo: 3, status: 'Declined', gateway: 'Successful' }),
    ])

    expect(dup.issueCount).toBe(1)
    expect(dup.issues[0]?.occurrences.map((o) => o.sourceType === 'current_import' && o.rowNo)).toEqual([2, 7])
    expect(included(dup.issues[0]!)).toEqual([true, false])
    expect(col.issueCount).toBe(1)
    expect(col.issues[0]?.occurrences.map((o) => o.sourceType === 'current_import' && [o.sheetId, o.rowNo])).toEqual([
      ['APP', 2],
      ['DEC', 3],
    ])
    expect(included(col.issues[0]!)).toEqual([true, true])
  })

  it('the first occurrence is the one of the file uploaded first, then the earlier sheet, then the lower rowNo (question 13)', () => {
    const { dup } = run([
      row({ fileId: 'second', fileOrder: 1, sheetId: 'APP-2', sheetOrder: 0, rowNo: 2 }),
      row({ fileId: 'first', fileOrder: 0, sheetId: 'APP-1b', sheetOrder: 3, rowNo: 2 }),
      row({ fileId: 'first', fileOrder: 0, sheetId: 'APP-1a', sheetOrder: 0, rowNo: 9 }),
    ])

    const occurrences = dup.issues[0]!.occurrences
    expect(occurrences.map((o) => o.sourceType === 'current_import' && o.sheetId)).toEqual([
      'APP-1a',
      'APP-1b',
      'APP-2',
    ])
    expect(included(dup.issues[0]!)).toEqual([true, false, false])
  })

  it('a row with an unresolved status against another of the same key: a collision with both included, never a duplicate', () => {
    const { dup, col } = run([row({ rowNo: 2 }), row({ rowNo: 3, status: null })])

    expect(dup.issues).toEqual([])
    expect(col.issueCount).toBe(1)
    expect(col.issues[0]!.occurrences.map((o) => [o.statusId, o.defaultIncluded])).toEqual([
      [STATUS.Successful, true],
      [null, true],
    ])
  })

  it('two rows with an unresolved status of the same key: also a collision', () => {
    const { dup, col } = run([row({ rowNo: 2, status: null }), row({ rowNo: 3, status: null })])

    expect(dup.issues).toEqual([])
    expect(col.issueCount).toBe(1)
    expect(col.issues[0]!.occurrences.map((o) => [o.statusId, o.defaultIncluded])).toEqual([
      [null, true],
      [null, true],
    ])
  })

  it('two Successful and an unresolved one: the duplicate of the Successful and a collision with the first and the unresolved', () => {
    const { dup, col } = run([row({ rowNo: 2 }), row({ rowNo: 3 }), row({ rowNo: 4, status: null })])

    expect(dup.issueCount).toBe(1)
    expect(col.issues[0]!.occurrences.map((o) => o.sourceType === 'current_import' && [o.rowNo, o.statusId])).toEqual([
      [2, STATUS.Successful],
      [4, null],
    ])
  })

  it('a lone row with an unresolved status is no finding', () => {
    const { dup, col } = run([row({ status: null })])

    expect(dup.issues).toEqual([])
    expect(col.issues).toEqual([])
  })

  it('foreign rows take no part', () => {
    const { dup, col } = run([
      row({ providerId: 101, channelId: 1001 }),
      row({ providerId: 101, channelId: 1001 }),
      row({ providerId: 101, channelId: 1001, status: 'Declined' }),
    ])

    expect(dup).toMatchObject({ outcome: 'passed', issueCount: 0 })
    expect(col).toMatchObject({ outcome: 'passed', issueCount: 0 })
  })

  it('without any matched row: both not_applicable', () => {
    const { dup, col } = run([row({ matchResult: 'unmatched' }), row({ matchResult: 'unmatched' })])

    expect(dup.outcome).toBe('not_applicable')
    expect(col.outcome).toBe('not_applicable')
  })
})
