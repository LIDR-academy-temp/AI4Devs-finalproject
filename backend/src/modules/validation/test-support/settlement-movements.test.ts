import { describe, expect, it } from 'vitest'
import { buildWorld, STATUS, settlementMovementsOf } from '../../../../prisma/synthetic.js'

// Characterization of the history the seed inserts (design D9, safety net of the refactor): the literals come from
// running the inline loop of seed.ts before extracting it, unchanged. After `! pnpm db:seed` they must match
// COUNT(*) per cycle and SUM(reserveHeldAmt) of SettlementTransaction.
const world = buildWorld()
const all = world.batches.flatMap((plan) => settlementMovementsOf(world, plan))
const cents = (n: number) => Math.round(n * 100)

describe('settlementMovementsOf over every batch the seed inserts', () => {
  it('produces the same number of movements per cycle', () => {
    expect(world.batches).toHaveLength(68)
    expect(all.filter((m) => m.cycle === 'E')).toHaveLength(21_151)
    expect(all.filter((m) => m.cycle === 'I')).toHaveLength(360)
    expect(all.filter((m) => m.cycle === 'R')).toHaveLength(1_920)
  })

  it('holds and releases the same reserve amounts', () => {
    expect(all.reduce((sum, m) => sum + cents(m.held), 0)).toBe(20_645_328) // 206 453.28
    expect(all.reduce((sum, m) => sum + cents(m.released), 0)).toBe(2_579_284) // 25 792.84
  })
})

describe('settlementMovementsOf for the last batch of ProviderB-Main', () => {
  const plan = world.batches.filter((b) => b.account === 'ProviderB-Main').at(-1)!
  const movements = settlementMovementsOf(world, plan)
  const of = (key: string, cycle: 'E' | 'I' | 'R') => movements.find((m) => m.key === key && m.cycle === cycle)

  it('is batch 51 with 420 E, 5 I and 320 R movements', () => {
    expect(plan.batchNo).toBe(51)
    expect(movements.filter((m) => m.cycle === 'E')).toHaveLength(420)
    expect(movements.filter((m) => m.cycle === 'I')).toHaveLength(5)
    expect(movements.filter((m) => m.cycle === 'R')).toHaveLength(320)
  })

  it('E: Successful holds amount × pct, Declined holds nothing, a later adjustment settles as Successful', () => {
    const t = world.txnByKey.get('t21700')!
    expect(of('t21700', 'E')).toMatchObject({
      status: 'Successful',
      statusId: STATUS.Successful,
      amount: 33.28,
      held: 3.33,
      released: 0,
      eventDate: t.transactionDate,
    })
    expect(of('t21716', 'E')).toMatchObject({ status: 'Declined', statusId: STATUS.Declined, amount: 0, held: 0 })
    expect(world.txnByKey.get('t21790')!.status).toBe('Refund')
    expect(of('t21790', 'E')).toMatchObject({ status: 'Successful', statusId: STATUS.Successful, held: 19.24 })
  })

  it('I: the current status at the date of the change', () => {
    expect(of('t19971', 'I')).toMatchObject({
      status: 'Chargeback',
      statusId: STATUS.Chargeback,
      amount: 65.48,
      held: 0,
      eventDate: new Date('2026-09-19T20:12:31.000Z'),
    })
  })

  it('R: the released reserve at the settlement date', () => {
    expect(of('t13555', 'R')).toMatchObject({
      statusId: STATUS.Successful,
      amount: 0,
      held: 0,
      released: 2.5,
      eventDate: plan.settlementDate,
    })
  })
})
