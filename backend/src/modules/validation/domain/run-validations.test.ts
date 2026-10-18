import { ValidationCode } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { input, movement, row, shuffled } from '../test-support/builders.js'
import { runValidations, VALIDATION_SLOTS, type ValidationSlot } from './run-validations.js'

// Spec "Ocho validaciones en orden fijo", "Orden y forma del informe", "No implementada no aprueba" and
// "Determinismo" (design D4, D5).
const ORDER = [
  'provider_mismatch',
  'non_recorded_adjustment',
  'duplicate_in_batch',
  'status_collision_in_batch',
  'duplicate_across_batches',
  'status_collision_across_batches',
  'missing_previous_to_batch',
  'missing_in_range',
]
const EMPTY_SLOTS: ValidationSlot[] = ValidationCode.options.map((code) => ({ code }))

describe('runValidations', () => {
  it('the slot table has the eight codes in the fixed order', () => {
    expect(VALIDATION_SLOTS.map((s) => s.code)).toEqual(ORDER)
  })

  it('with empty slots the report has eight not_implemented results in the fixed order and is not blocked', () => {
    const report = runValidations(
      input({ rows: [row({ transactionId: 1n }), row({ transactionId: 2n })] }),
      EMPTY_SLOTS,
    )

    expect(report.results.map((r) => r.code)).toEqual(ORDER)
    expect(report.results.every((r) => r.outcome === 'not_implemented' && r.issueCount === 0)).toBe(true)
    expect(report.results.every((r) => r.issues.length === 0)).toBe(true)
    expect(report.blocked).toBe(false)
  })

  it('a slot that runs gets its outcome derived from its findings and its issueCount', () => {
    const slots: ValidationSlot[] = EMPTY_SLOTS.map((s) =>
      s.code !== 'duplicate_in_batch'
        ? s
        : {
            code: s.code,
            run: () => ({
              applicable: true,
              issues: [
                {
                  issueType: 'duplicate',
                  scope: 'in_batch',
                  blocking: false,
                  transactionIdRaw: '1',
                  transactionId: 1n,
                  cycle: 'E',
                  statusId: 2,
                  occurrences: [],
                },
              ],
            }),
          },
    )

    const report = runValidations(input({ rows: [row()] }), slots)

    expect(report.results[2]).toMatchObject({ code: 'duplicate_in_batch', outcome: 'warning', issueCount: 1 })
    expect(report.blocked).toBe(false)
  })

  it('gives the same report whatever the arrival order of the rows and the history (determinism)', () => {
    const rows = [
      row({ transactionId: 11n, rowNo: 2, sheetId: 'APP', sheetOrder: 0 }),
      row({ transactionId: 11n, rowNo: 9, sheetId: 'APP', sheetOrder: 0 }),
      row({ transactionId: 12n, rowNo: 3, sheetId: 'DEC', sheetOrder: 1, status: 'Declined' }),
      row({ transactionId: 12n, rowNo: 4, sheetId: 'APP', sheetOrder: 0, fileId: 'file-2', fileOrder: 1 }),
      row({ transactionId: 13n, cycle: 'I', status: 'Chargeback', gateway: 'Successful', rowNo: 5 }),
      row({ transactionId: 14n, rowNo: 6, providerId: 101 }),
      row({ transactionId: 15n, rowNo: 7, matchResult: 'unmatched' }),
    ]
    const history = [
      movement({ transactionId: 11n, batchNo: 50 }),
      movement({ transactionId: 11n, batchNo: 49 }),
      movement({ transactionId: 12n, batchNo: 50, status: 'Declined' }),
    ]
    const base = input({ rows, history, hasPreviousBatches: true })

    const first = runValidations(base)
    const second = runValidations({ ...base, rows: shuffled(rows, 3), history: shuffled(history, 5) })

    expect(second).toEqual(first)
  })
})
