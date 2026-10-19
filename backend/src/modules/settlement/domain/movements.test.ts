import { describe, expect, it } from 'vitest'
import { RAM_01, row, SHEET, txn } from '../test-support/builders.js'
import { buildMovements } from './movements.js'

// Spec settlement "Importe, estado y fecha de cada movimiento", "Reserva retenida y liberada", "Ronda del movimiento I"
// (design D4, D12): status of the row in E and I, gateway amount, event date by cycle, reserve at 4 decimals.
const RAM_120 = { ...RAM_01, channelId: 1002, name: 'RAM-02', rollingReserveDays: 120 }
const ctx = {
  channels: new Map([
    [RAM_01.channelId, RAM_01],
    [RAM_120.channelId, RAM_120],
  ]),
  previousE: new Set<bigint>(),
  policy: 'hold_until_term' as const,
}
const one = (r: Parameters<typeof buildMovements>[0][number], context = ctx) =>
  buildMovements([r], context).movements[0]!

describe('E movements', () => {
  it('a Successful row takes the gateway amount and holds amount × applied percentage', () => {
    const created = new Date('2026-09-30T10:00:00.000Z')
    const m = one(row(2, {}, txn({ transactionId: 1n, amount: '33.2800', transactionDate: created })))

    expect(m).toMatchObject({
      cycle: 'E',
      statusCode: 'Successful',
      amount: '33.2800',
      eventDate: created,
      appliedReservePct: '0.100000',
      reserveDaysUsed: 180,
      reserveHeldAmt: '3.3280',
      reserveReleasedAmt: '0.0000',
      reserveEarlyReleasedAmt: '0.0000',
      expectedReserveReleaseAt: new Date('2027-03-29T10:00:00.000Z'),
      reservePolicySnapshot: null,
      roundNo: null,
      sheetId: SHEET,
      rowNo: 2,
    })
  })

  it('rounds a reserve with more than 4 decimals half up in the fourth (123.4565 × 0.1 = 12.3457)', () => {
    expect(one(row(2, {}, txn({ transactionId: 1n, amount: '123.4565' }))).reserveHeldAmt).toBe('12.3457')
  })

  it('a Declined row has amount 0, no reserve and no expected release', () => {
    const m = one(row(2, { statusCode: 'Declined' }))

    expect(m).toMatchObject({ statusCode: 'Declined', amount: '0.0000', reserveHeldAmt: '0.0000' })
    expect(m.expectedReserveReleaseAt).toBeNull()
  })

  it('keeps the status of the row when the gateway holds another one (Pending, or a later Chargeback)', () => {
    expect(one(row(2, {}, txn({ transactionId: 1n, statusCode: 'Pending' }))).statusCode).toBe('Successful')
    expect(one(row(3, {}, txn({ transactionId: 2n, statusCode: 'Chargeback' }))).statusCode).toBe('Successful')
  })
})

describe('I movements', () => {
  const changed = new Date('2026-10-03T08:00:00.000Z')
  const chargeback = (overrides = {}) =>
    txn({ transactionId: 5n, statusCode: 'Chargeback', lastStatusChangedAt: changed, amount: '65.4800', ...overrides })

  it('take the transaction amount, also an RDR (it deducts like a Chargeback or a Refund)', () => {
    expect(one(row(2, { cycle: 'I', statusCode: 'Chargeback' }, chargeback())).amount).toBe('65.4800')
    const rdr = txn({ transactionId: 6n, statusCode: 'RDR', lastStatusChangedAt: changed, amount: '120.0000' })
    expect(one(row(3, { cycle: 'I', statusCode: 'RDR' }, rdr))).toMatchObject({ statusCode: 'RDR', amount: '120.0000' })
  })

  it('mark the CHB 2 with excludeAmount and keep its amount', () => {
    expect(one(row(2, { cycle: 'I', statusCode: 'Chargeback', excludeAmount: true }, chargeback()))).toMatchObject({
      excludeAmount: true,
      amount: '65.4800',
    })
  })

  it('date the event with the provider date of the row first', () => {
    const provider = new Date('2026-10-02T00:00:00.000Z')
    const m = one(row(2, { cycle: 'I', statusCode: 'Chargeback', txnDate: provider }, chargeback()))

    expect(m.eventDate).toEqual(provider)
  })

  it('then with the last status change, when the gateway holds the status of the row', () => {
    expect(one(row(2, { cycle: 'I', statusCode: 'Chargeback' }, chargeback())).eventDate).toEqual(changed)
  })

  it('leave the event undated and warn when the gateway holds another status or has no change date', () => {
    const refunded = chargeback({ statusCode: 'Refund' })
    const undated = chargeback({ transactionId: 8n, lastStatusChangedAt: null })

    const { movements, warnings } = buildMovements(
      [
        row(2, { cycle: 'I', statusCode: 'Chargeback' }, refunded),
        row(3, { cycle: 'I', statusCode: 'Chargeback' }, undated),
      ],
      ctx,
    )

    expect(movements.map((m) => m.eventDate)).toEqual([null, null])
    expect(warnings).toEqual([
      { code: 'undated_adjustment', transactionId: '5', sheetId: SHEET, rowNo: 2, feeSkipped: false },
      { code: 'undated_adjustment', transactionId: '8', sheetId: SHEET, rowNo: 3, feeSkipped: false },
    ])
  })

  it('hold no reserve and record the account policy without applying it (#62)', () => {
    const m = one(row(2, { cycle: 'I', statusCode: 'Chargeback' }, chargeback()), {
      ...ctx,
      policy: 'release_on_chargeback',
    })

    expect(m).toMatchObject({ reserveHeldAmt: '0.0000', reserveEarlyReleasedAmt: '0.0000' })
    expect(JSON.parse(m.reservePolicySnapshot!)).toEqual({ policy: 'release_on_chargeback', applied: false })
  })

  it('round 1 with the E in the same batch, round 2 with the E in a previous attempt, null otherwise', () => {
    const t = chargeback()
    const inBatch = buildMovements([row(2, {}, t), row(3, { cycle: 'I', statusCode: 'Chargeback' }, t)], ctx).movements
    const previous = one(row(3, { cycle: 'I', statusCode: 'Chargeback' }, t), { ...ctx, previousE: new Set([5n]) })
    const none = one(row(3, { cycle: 'I', statusCode: 'Chargeback' }, t))

    expect(inBatch.map((m) => m.roundNo)).toEqual([null, 1])
    expect(previous.roundNo).toBe(2)
    expect(none.roundNo).toBeNull()
  })
})

describe('R movements', () => {
  it('release the reserve of the transaction, dated at its expiry, with the current status and amount 0', () => {
    const created = new Date('2026-04-01T10:00:00.000Z')
    const t = txn({ transactionId: 3n, amount: '50.0800', appliedReservePct: '0.050000', transactionDate: created })

    const m = one(row(2, { cycle: 'R', statusCode: null }, { ...t, statusCode: 'Refund' }))

    expect(m).toMatchObject({
      cycle: 'R',
      statusCode: 'Refund',
      amount: '0.0000',
      reserveReleasedAmt: '2.5040',
      reserveHeldAmt: '0.0000',
      reserveDaysUsed: 180,
      eventDate: new Date('2026-09-28T10:00:00.000Z'),
      expectedReserveReleaseAt: null,
    })
  })

  it('use the term of the transaction channel (120 days)', () => {
    const t = txn({ transactionId: 3n, channelId: 1002, transactionDate: new Date('2026-04-01T10:00:00.000Z') })

    expect(one(row(2, { cycle: 'R', statusCode: null }, t)).eventDate).toEqual(new Date('2026-07-30T10:00:00.000Z'))
  })
})
