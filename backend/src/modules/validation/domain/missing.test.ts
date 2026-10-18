import { describe, expect, it } from 'vitest'
import { InMemoryValidationSources, validationWorld } from '../application/__fakes__/in-memory.js'
import {
  ACCOUNT_B,
  at,
  candidate,
  countBy,
  expectedOf,
  input,
  movement,
  reserve,
  resultOf,
  row,
  STATUS,
} from '../test-support/builders.js'
import { sampleInput } from '../test-support/sample-input.js'
import { runValidations } from './run-validations.js'
import type { ValidationInput } from './types.js'

// Spec "Rangos y faltantes", "Los hallazgos persisten", "Candidatas a faltante", "Candidatas sin el histórico
// liquidado", "Faltantes por rango y por ciclo" and "Pending aparte" (design D3, D6, D10; questions 2, 8, 9, 10).
const previous = (i: ValidationInput) => resultOf(runValidations(i), 'missing_previous_to_batch')
const inRange = (i: ValidationInput) => resultOf(runValidations(i), 'missing_in_range')
const ids = (result: ReturnType<typeof previous>, range: string) =>
  result.issues.filter((x) => x.missingRange === range).map((x) => x.transactionIdRaw)

// An APP range from 2026-09-28 00:00 to 2026-10-07 23:00 built from two rows.
const MIN = at('2026-09-28T00:00:00.000Z')
const MAX = at('2026-10-07T23:00:00.000Z')
const APP_ROWS = [row({ transactionId: 1n, date: MIN, rowNo: 2 }), row({ transactionId: 2n, date: MAX, rowNo: 3 })]
const withCandidates = (overrides: Partial<ValidationInput>) => input({ rows: APP_ROWS, ...overrides })

describe('missing_previous_to_batch and missing_in_range over the samples', () => {
  it('batch-issues: previous E 10 (DEC) and in range E 3 (APP) / R 3, with the IDs of expected.json', async () => {
    const { input: sample } = await sampleInput('batch-issues')
    const expected = expectedOf('batch-issues') as { affectedIds: Record<string, string[]> }
    const before = previous(sample)
    const within = inRange(sample)

    expect(countBy(before, 'cycle')).toEqual({ E: 10 })
    expect(countBy(before, 'range')).toEqual({ DEC: 10 })
    expect(ids(before, 'DEC').sort()).toEqual([...expected.affectedIds.missing_previous_to_batch_DEC!].sort())
    expect(countBy(within, 'cycle')).toEqual({ E: 3, R: 3 })
    expect(ids(within, 'APP').sort()).toEqual([...expected.affectedIds.missing_in_range_E!].sort())
    expect(ids(within, 'R').sort()).toEqual([...expected.affectedIds.missing_in_range_R!].sort())
    expect(before.outcome).toBe('warning')
    expect(within.outcome).toBe('warning')
  })

  it('batch-clean: both passed', async () => {
    const { input: sample } = await sampleInput('batch-clean')

    expect(previous(sample)).toMatchObject({ outcome: 'passed', issueCount: 0 })
    expect(inRange(sample)).toMatchObject({ outcome: 'passed', issueCount: 0 })
  })

  it('legacy-provider: previous I = 3 (the refunds left out of the CB sheet), the later one discarded (question 2)', async () => {
    const { input: sample } = await sampleInput('legacy-provider')
    const expected = expectedOf('legacy-provider') as { affectedIds: Record<string, string[]> }
    const before = previous(sample)

    expect(countBy(before, 'cycle')).toEqual({ I: 3 })
    expect(ids(before, 'I').sort()).toEqual([...expected.affectedIds.missing_previous_to_batch_I!].sort())
    expect(inRange(sample)).toMatchObject({ outcome: 'passed', issueCount: 0 })
  })
})

describe('missing candidates', () => {
  it('limits are inclusive: equal to min and max are in range, one ms before min is previous', () => {
    const i = withCandidates({
      candidates: [
        candidate({ transactionId: 10n, date: MIN }),
        candidate({ transactionId: 11n, date: MAX }),
        candidate({ transactionId: 12n, date: new Date(MIN.getTime() - 1) }),
      ],
    })

    expect(inRange(i).issues.map((x) => x.transactionId)).toEqual([10n, 11n])
    expect(previous(i).issues.map((x) => x.transactionId)).toEqual([12n])
  })

  it('a candidate after the max is in neither validation', () => {
    const i = withCandidates({ candidates: [candidate({ transactionId: 10n, date: new Date(MAX.getTime() + 1) })] })

    expect(previous(i).issues).toEqual([])
    expect(inRange(i).issues).toEqual([])
  })

  it('every finding carries missingType, range, relevantDate and the expected status', () => {
    const i = withCandidates({ candidates: [candidate({ transactionId: 10n, date: at('2026-10-01T00:00:00.000Z') })] })

    expect(inRange(i).issues[0]).toMatchObject({
      issueType: 'missing',
      scope: 'in_range',
      blocking: false,
      cycle: 'E',
      missingType: 'in_range',
      missingRange: 'APP',
      relevantDate: at('2026-10-01T00:00:00.000Z'),
      statusId: STATUS.Successful,
      transactionIdRaw: 'src-10',
      occurrences: [],
    })
  })

  it('a candidate present in the batch in that cycle is not missing', () => {
    const i = withCandidates({ candidates: [candidate({ transactionId: 1n, date: MIN })] })

    expect(inRange(i).issues).toEqual([])
  })

  it('a candidate processed in that cycle in a live attempt, returned by mistake, is excluded by the engine (D3)', () => {
    const i = withCandidates({
      candidates: [candidate({ transactionId: 10n, date: MIN })],
      history: [movement({ transactionId: 10n, cycle: 'E' })],
      hasPreviousBatches: true,
    })

    expect(inRange(i).issues).toEqual([])
  })

  it('a channel whose primary account is not this one gives no candidates (question 9)', () => {
    const i = withCandidates({ candidates: [candidate({ transactionId: 10n, date: MIN, channelId: 1013 })] })

    expect(inRange(i).issues).toEqual([])
  })

  it('Declined candidates only when there is a DEC range', () => {
    const i = withCandidates({ candidates: [candidate({ transactionId: 10n, status: 'Declined', date: MIN })] })

    expect(previous(i).issues).toEqual([])
    expect(inRange(i).issues).toEqual([])
  })

  it('Pending in the APP range: no finding, counted in pendingInRangeCount once each (question 10)', () => {
    const report = runValidations(
      withCandidates({
        rows: [...APP_ROWS, row({ transactionId: 3n, status: 'Declined', date: MIN })],
        candidates: [
          candidate({ transactionId: 20n, status: 'Pending', date: at('2026-10-01T00:00:00.000Z') }),
          candidate({ transactionId: 21n, status: 'Pending', date: at('2026-10-02T00:00:00.000Z') }),
          candidate({ transactionId: 22n, status: 'Pending', date: at('2026-09-01T00:00:00.000Z') }),
        ],
      }),
    )

    expect(resultOf(report, 'missing_in_range').issues).toEqual([])
    expect(resultOf(report, 'missing_previous_to_batch').issues).toEqual([])
    expect(report.pendingInRangeCount).toBe(2)
  })

  it('I candidates are compared by the date of the status change', () => {
    const i = input({
      rows: [row({ transactionId: 1n, cycle: 'I', status: 'Refund', gateway: 'Refund', changedAt: MIN })],
      candidates: [
        candidate({ transactionId: 10n, status: 'Chargeback', changedAt: new Date(MIN.getTime() - 1), date: MAX }),
        candidate({ transactionId: 11n, status: 'Refund', changedAt: MIN, date: at('2026-01-01T00:00:00.000Z') }),
      ],
    })

    expect(previous(i).issues.map((x) => [x.transactionId, x.cycle, x.missingRange, x.statusId])).toEqual([
      [10n, 'I', 'I', STATUS.Chargeback],
    ])
    expect(inRange(i).issues.map((x) => x.transactionId)).toEqual([11n])
  })

  it('I candidates without lastStatusChangedAt are no finding but are counted in undatedCandidateCount (L2)', () => {
    const report = runValidations(
      input({
        rows: [row({ transactionId: 1n, cycle: 'I', status: 'Refund', gateway: 'Refund', changedAt: MIN })],
        candidates: [
          candidate({ transactionId: 10n, status: 'Chargeback', changedAt: null }),
          candidate({ transactionId: 11n, status: 'Refund', changedAt: null }),
          candidate({ transactionId: 12n, status: 'Refund', changedAt: null, channelId: 1013 }),
        ],
      }),
    )

    expect(resultOf(report, 'missing_previous_to_batch').issues).toEqual([])
    expect(resultOf(report, 'missing_in_range').issues).toEqual([])
    expect(report.undatedCandidateCount).toBe(2)
  })

  it('R: held reserves not released; an early-released one is not missing', () => {
    const i = input({
      rows: [row({ transactionId: 1n, cycle: 'R', status: 'Successful', date: MIN })],
      reserveCandidates: [
        reserve({ transactionId: 10n, date: MIN }),
        reserve({ transactionId: 11n, date: MIN, earlyReleased: '3.5000' }),
        reserve({ transactionId: 12n, date: MIN, held: '0.0000' }),
        reserve({ transactionId: 13n, date: new Date(MIN.getTime() - 1) }),
      ],
    })

    expect(inRange(i).issues.map((x) => [x.transactionId, x.cycle, x.missingRange])).toEqual([[10n, 'R', 'R']])
    expect(previous(i).issues.map((x) => x.transactionId)).toEqual([13n])
  })

  it('R: a reserve created after the max of the R range is not expired yet and is in neither validation', () => {
    const i = input({
      rows: [row({ transactionId: 1n, cycle: 'R', status: 'Successful', date: MIN })],
      reserveCandidates: [reserve({ transactionId: 14n, date: new Date(MIN.getTime() + 1) })],
    })

    expect(previous(i).issues).toEqual([])
    expect(inRange(i).issues).toEqual([])
  })

  it('without any range: both not_applicable', () => {
    const i = input({ rows: [row({ matchResult: 'unmatched' })], candidates: [candidate()] })

    expect(previous(i).outcome).toBe('not_applicable')
    expect(inRange(i).outcome).toBe('not_applicable')
  })

  it('counts by cycle add APP and DEC into E, and by range keep them apart', () => {
    const i = withCandidates({
      rows: [...APP_ROWS, row({ transactionId: 3n, status: 'Declined', date: MIN })],
      candidates: [
        candidate({ transactionId: 10n, date: MIN }),
        candidate({ transactionId: 11n, status: 'Declined', date: MIN }),
      ],
    })

    expect(countBy(inRange(i), 'cycle')).toEqual({ E: 2 })
    expect(countBy(inRange(i), 'range')).toEqual({ APP: 1, DEC: 1 })
  })
})

describe('expired reserves on an account with mixed terms (H1)', () => {
  // RAM-11 holds for 180 days, RAM-13 for 120: both primary channels of the account.
  const account = { ...ACCOUNT_B, primaryChannelIds: new Set([1011, 1013]) }
  const rows = [
    row({ transactionId: 1n, cycle: 'R', status: 'Successful', channelId: 1011, date: at('2026-04-01T00:00:00.000Z') }),
    row({ transactionId: 2n, cycle: 'R', status: 'Successful', channelId: 1013, date: at('2026-06-01T00:00:00.000Z') }),
  ]
  const mixed = input({
    account,
    rows,
    reserveCandidates: [
      // 180 d, created between the two rows but expiring 2026-10-28: not expired yet, never missing
      reserve({ transactionId: 20n, channelId: 1011, date: at('2026-05-01T00:00:00.000Z') }),
      // 180 d, expired 2026-09-27, before the R range (2026-09-28…2026-09-29)
      reserve({ transactionId: 21n, channelId: 1011, date: at('2026-03-31T00:00:00.000Z') }),
      // 120 d, expires 2026-09-29, the max of the R range
      reserve({ transactionId: 22n, channelId: 1013, date: at('2026-06-01T00:00:00.000Z') }),
    ],
  })

  it('a 180-day reserve created inside the creation span but not expired yet is no false missing_in_range', () => {
    expect(inRange(mixed).issues.map((x) => x.transactionId)).toEqual([22n])
  })

  it('classifies by expiry date and reports it as relevantDate', () => {
    expect(previous(mixed).issues.map((x) => [x.transactionId, x.relevantDate])).toEqual([
      [21n, at('2026-09-27T00:00:00.000Z')],
    ])
    expect(inRange(mixed).issues[0]?.relevantDate).toEqual(at('2026-09-29T00:00:00.000Z'))
  })
})

describe('R limits with min < max (M3)', () => {
  // Two RR rows of 180-day channels: the R range is 2026-09-28T00:00 … 2026-10-05T12:00 by expiry.
  const CREATED_MIN = at('2026-04-01T00:00:00.000Z')
  const CREATED_MAX = at('2026-04-08T12:00:00.000Z')
  const rRows = [
    row({ transactionId: 1n, cycle: 'R', status: 'Successful', channelId: 1011, date: CREATED_MIN }),
    row({ transactionId: 2n, cycle: 'R', status: 'Successful', channelId: 1012, date: CREATED_MAX }),
  ]
  const withReserves = (...reserves: ReturnType<typeof reserve>[]) =>
    input({ rows: rRows, reserveCandidates: reserves })

  it('a reserve expiring exactly at the min of the R range is in range', () => {
    const i = withReserves(reserve({ transactionId: 10n, channelId: 1011, date: CREATED_MIN }))

    expect(inRange(i).issues.map((x) => [x.transactionId, x.relevantDate])).toEqual([
      [10n, at('2026-09-28T00:00:00.000Z')],
    ])
    expect(previous(i).issues).toEqual([])
  })

  it('a reserve expiring exactly at the max of the R range is in range', () => {
    const i = withReserves(reserve({ transactionId: 11n, channelId: 1012, date: CREATED_MAX }))

    expect(inRange(i).issues.map((x) => [x.transactionId, x.relevantDate])).toEqual([
      [11n, at('2026-10-05T12:00:00.000Z')],
    ])
  })

  it('one ms before the min is previous, one ms after the max is in neither', () => {
    const i = withReserves(
      reserve({ transactionId: 12n, channelId: 1011, date: new Date(CREATED_MIN.getTime() - 1) }),
      reserve({ transactionId: 13n, channelId: 1012, date: new Date(CREATED_MAX.getTime() + 1) }),
    )

    expect(previous(i).issues.map((x) => x.transactionId)).toEqual([12n])
    expect(inRange(i).issues).toEqual([])
  })
})

describe('registered missing findings (question 8)', () => {
  const settledImport = validationWorld().batches.find((b) => b.accountId === ACCOUNT_B.accountId)!.importId
  const candidates = [candidate({ transactionId: 10n, date: MIN })]

  async function registeredBy(importId: string, undoneBatch = false) {
    const sources = new InMemoryValidationSources()
    if (undoneBatch)
      sources.addBatch({
        batchId: 'undone-only',
        accountId: ACCOUNT_B.accountId,
        batchNo: 60,
        attemptNo: 1,
        status: 'undone',
        importId,
        movements: [],
      })
    sources.registerMissing({ providerId: ACCOUNT_B.providerId, cycle: 'E', transactionId: 10n, importId })
    return sources.registered(ACCOUNT_B.providerId)
  }

  it('registered by an import with a processed or paid batch: excluded', async () => {
    const i = withCandidates({ candidates, registeredMissing: await registeredBy(settledImport) })

    expect(inRange(i).issues).toEqual([])
  })

  it('registered only by an import without a batch: still missing (also a repeated run of the same import)', async () => {
    const i = withCandidates({ candidates, registeredMissing: await registeredBy('unprocessed-import') })

    expect(inRange(i).issues.map((x) => x.transactionId)).toEqual([10n])
  })

  it('a repeated run of the same unprocessed import: what its previous run registered comes out again', async () => {
    const importId = 'import-being-revalidated'
    const i = withCandidates({ candidates, registeredMissing: await registeredBy(importId) })

    expect(inRange(i).issues.map((x) => x.transactionId)).toEqual([10n])
  })

  it('registered by an import whose only batch is undone: still missing', async () => {
    const i = withCandidates({ candidates, registeredMissing: await registeredBy('undone-import', true) })

    expect(inRange(i).issues.map((x) => x.transactionId)).toEqual([10n])
  })
})
