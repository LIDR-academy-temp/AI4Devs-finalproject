import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '../../catalog/application/__fakes__/in-memory.js'
import { accountScopeOf, InMemoryValidationSources, validationWorld } from '../application/__fakes__/in-memory.js'
import { input, movement, resultOf, row, STATUS } from '../test-support/builders.js'
import { sampleInput } from '../test-support/sample-input.js'
import { runValidations } from './run-validations.js'
import type { HistoryMovement, ValidationRow } from './types.js'

// Spec "Comparación con batches anteriores" and "CHB 2 contra un Chargeback ya liquidado" (design D3, D6; questions
// 6 and 7; Ticket 2 CA4 and CA7).
const run = (rows: ValidationRow[], history: HistoryMovement[], hasPreviousBatches = true) => {
  const report = runValidations(input({ rows, history, hasPreviousBatches }))
  return {
    report,
    dup: resultOf(report, 'duplicate_across_batches'),
    col: resultOf(report, 'status_collision_across_batches'),
  }
}

describe('duplicate_across_batches and status_collision_across_batches', () => {
  it('batch-issues: the APP already settled (current excluded) and the old approval reported as declined (current included)', async () => {
    const { input: sample } = await sampleInput('batch-issues')
    const report = runValidations(sample)
    const dup = resultOf(report, 'duplicate_across_batches')
    const col = resultOf(report, 'status_collision_across_batches')

    expect(dup).toMatchObject({ outcome: 'warning', issueCount: 1 })
    expect(dup.issues[0]).toMatchObject({
      issueType: 'duplicate',
      scope: 'across_batches',
      blocking: false,
      transactionIdRaw: '504712738863260',
      cycle: 'E',
    })
    const current = dup.issues[0]!.occurrences.filter((o) => o.sourceType === 'current_import')
    const previous = dup.issues[0]!.occurrences.filter((o) => o.sourceType === 'previous_batch')
    expect(current.map((o) => o.defaultIncluded)).toEqual([false])
    expect(previous).toHaveLength(1)
    expect(previous[0]).toMatchObject({
      batchNo: 51,
      attemptNo: 1,
      accountId: ACCOUNT_IDS['ProviderB-Main'],
      statusId: STATUS.Successful,
      batchId: expect.any(String),
    })

    expect(col).toMatchObject({ outcome: 'warning', issueCount: 1 })
    expect(col.issues[0]).toMatchObject({
      issueType: 'collision',
      scope: 'across_batches',
      transactionIdRaw: '381797111970492',
    })
    const currentCol = col.issues[0]!.occurrences.filter((o) => o.sourceType === 'current_import')
    expect(currentCol.map((o) => [o.statusId, o.defaultIncluded])).toEqual([[STATUS.Declined, true]])
    expect(col.issues[0]!.occurrences.some((o) => o.sourceType === 'previous_batch')).toBe(true)
  })

  it('batch-clean: both passed', async () => {
    const report = runValidations((await sampleInput('batch-clean')).input)

    expect(resultOf(report, 'duplicate_across_batches').outcome).toBe('passed')
    expect(resultOf(report, 'status_collision_across_batches').outcome).toBe('passed')
  })

  it('an undone attempt does not count (Ticket 2 CA4)', async () => {
    const sources = new InMemoryValidationSources()
    const account = accountScopeOf('ProviderB-Main')
    sources.addBatch({
      batchId: 'undone-attempt',
      accountId: account.accountId,
      batchNo: 52,
      attemptNo: 1,
      status: 'undone',
      importId: 'import-undone',
      movements: [
        {
          transactionId: 900_001n,
          cycle: 'E',
          statusId: STATUS.Successful,
          excludeAmount: false,
          sheetId: null,
          rowNo: null,
          reserveHeldAmt: '1.0000',
          reserveEarlyReleasedAmt: '0.0000',
        },
      ],
    })
    const history = await sources.movements(account.providerId, [900_001n], 'import-now')

    const { dup, col } = run([row({ transactionId: 900_001n })], history)

    expect(history).toEqual([])
    expect(dup.issues).toEqual([])
    expect(col.issues).toEqual([])
  })

  it('a movement of another account of the provider (ProviderA-EUR) counts for a ProviderA-USD import', async () => {
    const eur = validationWorld().batches.find((b) => b.accountId === ACCOUNT_IDS['ProviderA-EUR'])!
    const settled = eur.movements.find((m) => m.cycle === 'E' && m.statusId === STATUS.Successful)!
    const usd = accountScopeOf('ProviderA-USD')
    const history = await new InMemoryValidationSources().movements(
      usd.providerId,
      [settled.transactionId],
      'import-now',
    )

    const report = runValidations(
      input({
        account: usd,
        rows: [row({ transactionId: settled.transactionId, providerId: 101, channelId: 1003 })],
        history,
        hasPreviousBatches: true,
      }),
    )
    const dup = resultOf(report, 'duplicate_across_batches')

    expect(dup.issueCount).toBe(1)
    expect(dup.issues[0]!.occurrences.find((o) => o.sourceType === 'previous_batch')).toMatchObject({
      batchId: eur.batchId,
      accountId: ACCOUNT_IDS['ProviderA-EUR'],
    })
  })

  it('a current CHB 2 against a settled Chargeback without excludeAmount: nothing (question 7)', () => {
    const { dup, col } = run(
      [row({ cycle: 'I', status: 'Chargeback', gateway: 'Chargeback', excludeAmount: true })],
      [movement({ cycle: 'I', status: 'Chargeback' })],
    )

    expect(dup.issues).toEqual([])
    expect(col.issues).toEqual([])
  })

  it('the same adjustment with the same status in a previous batch: a duplicate with the current excluded', () => {
    const { dup, col } = run(
      [row({ cycle: 'I', status: 'Refund', gateway: 'Refund' })],
      [movement({ cycle: 'I', status: 'Refund' })],
    )

    expect(dup.issueCount).toBe(1)
    expect(dup.issues[0]!.occurrences.map((o) => [o.sourceType, o.defaultIncluded])).toEqual([
      ['current_import', false],
      ['previous_batch', true],
    ])
    expect(col.issues).toEqual([])
  })

  it('a different status of the same cycle in a previous batch: a collision with the current included', () => {
    const { col } = run(
      [row({ cycle: 'I', status: 'Refund', gateway: 'Refund' })],
      [movement({ cycle: 'I', status: 'Chargeback' })],
    )

    expect(col.issues[0]!.occurrences.map((o) => [o.sourceType, o.defaultIncluded])).toEqual([
      ['current_import', true],
      ['previous_batch', true],
    ])
  })

  it('a current row with an unresolved status against a settled movement: a collision with the current included', () => {
    const { dup, col } = run([row({ status: null })], [movement({ status: 'Successful' })])

    expect(dup.issues).toEqual([])
    expect(col.issues[0]!.occurrences.map((o) => [o.sourceType, o.statusId, o.defaultIncluded])).toEqual([
      ['current_import', null, true],
      ['previous_batch', STATUS.Successful, true],
    ])
  })

  it('R has no status: a settled R movement (Successful) and a current RR row (Chargeback) are a duplicate, the row excluded (H1)', () => {
    const { dup, col } = run(
      [row({ cycle: 'R', status: 'Chargeback', gateway: 'Chargeback' })],
      [movement({ cycle: 'R', status: 'Successful' })],
    )

    expect(col.issues).toEqual([])
    expect(dup.issueCount).toBe(1)
    expect(dup.issues[0]!.occurrences.map((o) => [o.sourceType, o.statusId, o.defaultIncluded])).toEqual([
      ['current_import', STATUS.Chargeback, false],
      ['previous_batch', STATUS.Successful, true],
    ])
  })

  it('a collision against the history also lists a settled CHB 2 next to the different status (L5)', () => {
    const { dup, col } = run(
      [row({ cycle: 'I', status: 'Chargeback', gateway: 'Chargeback' })],
      [
        movement({ cycle: 'I', status: 'Chargeback', excludeAmount: true, batchNo: 50 }),
        movement({ cycle: 'I', status: 'Refund', batchNo: 51 }),
      ],
    )

    expect(dup.issues).toEqual([])
    expect(col.issueCount).toBe(1)
    expect(col.issues[0]!.occurrences.map((o) => [o.sourceType, o.statusId, o.excludeAmount])).toEqual([
      ['current_import', STATUS.Chargeback, false],
      ['previous_batch', STATUS.Chargeback, true],
      ['previous_batch', STATUS.Refund, false],
    ])
  })

  it('CHB 2 settled and a current Chargeback alone are still nothing', () => {
    const { dup, col } = run(
      [row({ cycle: 'I', status: 'Chargeback', gateway: 'Chargeback' })],
      [movement({ cycle: 'I', status: 'Chargeback', excludeAmount: true })],
    )

    expect(dup.issues).toEqual([])
    expect(col.issues).toEqual([])
  })

  it('history of another cycle is not compared', () => {
    const { dup, col } = run([row({ cycle: 'R', status: 'Successful' })], [movement({ cycle: 'E' })])

    expect(dup.issues).toEqual([])
    expect(col.issues).toEqual([])
  })

  it('without previous attempts of the provider: both not_applicable (Ticket 2 CA7)', () => {
    const { dup, col } = run([row()], [], false)

    expect(dup.outcome).toBe('not_applicable')
    expect(col.outcome).toBe('not_applicable')
  })

  it('is independent of the in-batch detection (question 6)', () => {
    const { report, dup, col } = run(
      [
        row({ transactionId: 1n, sheetId: 'APP', rowNo: 2 }),
        row({ transactionId: 1n, sheetId: 'APP', rowNo: 3 }),
        row({ transactionId: 2n, sheetId: 'APP', rowNo: 4 }),
        row({ transactionId: 2n, sheetId: 'DEC', sheetOrder: 1, rowNo: 2, status: 'Declined', gateway: 'Successful' }),
      ],
      [movement({ transactionId: 1n }), movement({ transactionId: 2n })],
    )

    expect(resultOf(report, 'duplicate_in_batch').issueCount).toBe(1)
    expect(resultOf(report, 'status_collision_in_batch').issueCount).toBe(1)
    expect(dup.issues.map((i) => i.transactionId)).toEqual([1n, 2n])
    expect(
      dup.issues[0]!.occurrences.filter((o) => o.sourceType === 'current_import').map((o) => o.defaultIncluded),
    ).toEqual([false, false])
    expect(col.issues.map((i) => i.transactionId)).toEqual([2n])
    expect(col.issues[0]!.occurrences.filter((o) => o.sourceType === 'current_import').map((o) => o.statusId)).toEqual([
      STATUS.Declined,
    ])
  })
})
