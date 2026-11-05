import { describe, expect, it } from 'vitest'
import { movement, SHEET } from '../test-support/builders.js'
import { applyAdjustmentReserve } from './adjustment-reserve.js'
import type { MovementPlan, PriorReserveState } from './types.js'

// The reserve of an adjusted transaction (settlement-reserve-chargeback D1; spec settlement "Política de reserva ante
// chargeback", "Reserva ya liberada por un ajuste"): with release_on_chargeback the first I movement of a transaction
// releases the whole reserve its E held, whatever the adjustment status (Chargeback, Refund or RDR) and amount.
const PREVIOUS_BATCH = 'b0000000-0000-4000-8000-000000000049'
const OTHER_ACCOUNT_BATCH = 'b0000000-0000-4000-8000-000000000077'

const held = (amount: string, batchId = PREVIOUS_BATCH): PriorReserveState => ({
  held: { amount, batchId },
  releasedInR: false,
  releasedByAdjustment: false,
})
const states = (entries: [bigint, PriorReserveState][]) => new Map(entries)

const adjustment = (rowNo: number, transactionId: bigint, overrides: Partial<MovementPlan> = {}) =>
  movement(rowNo, { transactionId, cycle: 'I', statusCode: 'Chargeback', ...overrides })
const approved = (rowNo: number, transactionId: bigint, reserveHeldAmt: string) =>
  movement(rowNo, { transactionId, cycle: 'E', statusCode: 'Successful', reserveHeldAmt })
const reserve = (rowNo: number, transactionId: bigint, reserveReleasedAmt = '10.0000') =>
  movement(rowNo, { transactionId, cycle: 'R', amount: '0.0000', reserveReleasedAmt })

const release = (
  movements: MovementPlan[],
  reserveStates: ReadonlyMap<bigint, PriorReserveState> = new Map(),
  policy: 'release_on_chargeback' | 'hold_until_term' = 'release_on_chargeback',
) => applyAdjustmentReserve(movements, { policy, reserveStates })
const snapshotOf = (m: MovementPlan) => JSON.parse(m.reservePolicySnapshot!)
const adjustmentsOf = (plan: ReturnType<typeof release>) => plan.movements.filter((m) => m.cycle === 'I')

describe('applyAdjustmentReserve with release_on_chargeback', () => {
  it.each([
    ['Chargeback', 1n],
    ['Refund', 2n],
    ['RDR', 3n],
  ] as const)(
    'a %s of a reserve held in a previous attempt releases it, with heldInBatchId (round 2)',
    (status, id) => {
      const plan = release([adjustment(2, id, { statusCode: status })], states([[id, held('12.3457')]]))

      expect(plan.movements[0]!.reserveEarlyReleasedAmt).toBe('12.3457')
      expect(snapshotOf(plan.movements[0]!)).toEqual({
        policy: 'release_on_chargeback',
        applied: true,
        outcome: 'released',
        heldInBatchId: PREVIOUS_BATCH,
      })
      expect(plan.warnings).toEqual([])
    },
  )

  it('an adjustment of a reserve held in the same batch releases it with heldInBatchId null (round 1)', () => {
    const plan = release([approved(2, 5n, '12.3457'), adjustment(3, 5n)])

    expect(plan.movements.map((m) => [m.cycle, m.reserveHeldAmt, m.reserveEarlyReleasedAmt])).toEqual([
      ['E', '12.3457', '0.0000'],
      ['I', '0.0000', '12.3457'],
    ])
    expect(snapshotOf(plan.movements[1]!)).toMatchObject({ outcome: 'released', heldInBatchId: null })
  })

  it('a partial refund (50.0000 of 200.0000) releases the whole reserve held (20.0000), not a share of it', () => {
    const refund = adjustment(2, 7n, { statusCode: 'Refund', amount: '50.0000', gatewayAmount: '200.0000' })

    const plan = release([refund], states([[7n, held('20.0000')]]))

    expect(plan.movements[0]!.reserveEarlyReleasedAmt).toBe('20.0000')
  })

  it('releases a reserve held by another account of the provider, with the policy of the processing account', () => {
    const plan = release([adjustment(2, 8n)], states([[8n, held('4.5000', OTHER_ACCOUNT_BATCH)]]))

    expect(plan.movements[0]!.reserveEarlyReleasedAmt).toBe('4.5000')
    expect(snapshotOf(plan.movements[0]!)).toMatchObject({
      policy: 'release_on_chargeback',
      heldInBatchId: OTHER_ACCOUNT_BATCH,
    })
  })

  it('prefers the reserve held in a previous attempt over an E of the same transaction in this batch', () => {
    const plan = release([approved(2, 5n, '0.0000'), adjustment(3, 5n)], states([[5n, held('9.0000')]]))

    expect(adjustmentsOf(plan)[0]).toMatchObject({ reserveEarlyReleasedAmt: '9.0000' })
    expect(snapshotOf(adjustmentsOf(plan)[0]!).heldInBatchId).toBe(PREVIOUS_BATCH)
  })

  it('an adjustment without a held reserve is no_held_reserve and releases 0', () => {
    const declined = movement(2, { transactionId: 6n, cycle: 'E', statusCode: 'Declined', amount: '0.0000' })

    const plan = release([declined, adjustment(3, 6n), adjustment(4, 9n)])

    expect(adjustmentsOf(plan).map((m) => [m.reserveEarlyReleasedAmt, snapshotOf(m).outcome])).toEqual([
      ['0.0000', 'no_held_reserve'],
      ['0.0000', 'no_held_reserve'],
    ])
    expect(snapshotOf(adjustmentsOf(plan)[0]!).heldInBatchId).toBeNull()
  })

  it.each([
    ['Chargeback and CHB 2', 'Chargeback', true],
    ['Refund and Chargeback', 'Refund', false],
  ] as const)(
    '%s of the same transaction: only the first releases, the second is already_released',
    (_, first, chb2) => {
      const plan = release(
        [adjustment(2, 5n, { statusCode: first }), adjustment(3, 5n, { excludeAmount: chb2 })],
        states([[5n, held('12.3457')]]),
      )

      expect(plan.movements.map((m) => [m.reserveEarlyReleasedAmt, snapshotOf(m).outcome])).toEqual([
        ['12.3457', 'released'],
        ['0.0000', 'already_released'],
      ])
    },
  )

  it.each(['Chargeback', 'Refund', 'RDR'] as const)(
    'a %s of a reserve an adjustment of a previous attempt released is already_released',
    (status) => {
      const prior = { ...held('12.3457'), releasedByAdjustment: true }

      const plan = release([adjustment(2, 5n, { statusCode: status })], states([[5n, prior]]))

      expect(plan.movements[0]).toMatchObject({ reserveEarlyReleasedAmt: '0.0000' })
      expect(snapshotOf(plan.movements[0]!).outcome).toBe('already_released')
    },
  )

  it('a reserve released in a previous R is released_in_r', () => {
    const plan = release([adjustment(2, 5n)], states([[5n, { ...held('12.3457'), releasedInR: true }]]))

    expect(plan.movements[0]).toMatchObject({ reserveEarlyReleasedAmt: '0.0000' })
    expect(snapshotOf(plan.movements[0]!).outcome).toBe('released_in_r')
  })

  it('an R of the same transaction in this batch wins (P3): the I is released_in_r and the R releases in full', () => {
    const plan = release([adjustment(2, 5n), reserve(3, 5n, '12.3457')], states([[5n, held('12.3457')]]))

    expect(plan.movements.map((m) => [m.cycle, m.reserveEarlyReleasedAmt, m.reserveReleasedAmt])).toEqual([
      ['I', '0.0000', '0.0000'],
      ['R', '0.0000', '12.3457'],
    ])
    expect(snapshotOf(plan.movements[0]!).outcome).toBe('released_in_r')
    expect(plan.warnings).toEqual([])
  })

  it('a reserve released in an undone attempt has no prior state and is released again', () => {
    const plan = release([adjustment(2, 5n)], states([[5n, held('12.3457')]]))

    expect(snapshotOf(plan.movements[0]!).outcome).toBe('released')
  })
})

describe('applyAdjustmentReserve with hold_until_term', () => {
  it.each(['Chargeback', 'Refund', 'RDR'] as const)('a %s releases nothing and records held_until_term', (status) => {
    const plan = release(
      [adjustment(2, 5n, { statusCode: status })],
      states([[5n, held('12.3457')]]),
      'hold_until_term',
    )

    expect(plan.movements[0]!.reserveEarlyReleasedAmt).toBe('0.0000')
    expect(snapshotOf(plan.movements[0]!)).toEqual({
      policy: 'hold_until_term',
      applied: true,
      outcome: 'held_until_term',
      heldInBatchId: null,
    })
  })
})

describe('an RR row of a reserve an adjustment released (P12)', () => {
  it.each(['release_on_chargeback', 'hold_until_term'] as const)(
    'releases 0 and warns reserve_already_released with %s',
    (policy) => {
      const prior = { ...held('12.3457'), releasedByAdjustment: true }

      const plan = release([reserve(4, 5n, '12.3457')], states([[5n, prior]]), policy)

      expect(plan.movements[0]).toMatchObject({ cycle: 'R', reserveReleasedAmt: '0.0000' })
      expect(plan.warnings).toEqual([
        { code: 'reserve_already_released', transactionId: '5', sheetId: SHEET, rowNo: 4 },
      ])
    },
  )

  it('an R of a reserve not released by an adjustment keeps its amount and has no snapshot', () => {
    const plan = release([reserve(4, 5n, '12.3457')], states([[5n, { ...held('12.3457'), releasedInR: false }]]))

    expect(plan.movements[0]).toMatchObject({ reserveReleasedAmt: '12.3457', reservePolicySnapshot: null })
    expect(plan.warnings).toEqual([])
  })

  it('leaves E movements untouched', () => {
    const e = approved(2, 5n, '12.3457')

    expect(release([e]).movements).toEqual([e])
  })
})
