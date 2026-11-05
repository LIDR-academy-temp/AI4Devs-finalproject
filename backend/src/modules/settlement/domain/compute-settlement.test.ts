import { describe, expect, it } from 'vitest'
import { Prisma } from '../../../generated/prisma/client.js'
import { expectedOf } from '../../validation/test-support/builders.js'
import { fee, input, row, txn } from '../test-support/builders.js'
import { sampleSheetNames, settlementSampleInput } from '../test-support/sample-input.js'
import { computeSettlement } from './compute-settlement.js'

// The settlement engine over the samples, against their expected.json (README §2.6, design D2, D20). The transactional
// fees are a separate step (group 11, design D17): until then fees and amountPayable are not compared here.
interface Summary {
  qty: Record<string, number>
  amounts: Record<string, string>
  otherFeeAmt: string
}
const summaryOf = (name: 'batch-clean' | 'legacy-provider') => expectedOf(name).summary as unknown as Summary
const total = (plan: ReturnType<typeof computeSettlement>, category: string) =>
  plan.summary.totals.find((t) => t.category === category)!

describe('batch-clean against its expected.json', async () => {
  const expected = summaryOf('batch-clean')
  const byCycle = expectedOf('batch-clean').byCycle as Record<string, number>
  const plan = computeSettlement(await settlementSampleInput('batch-clean'))

  it('proposes batch 123 (expected.proposedBatchNo), attempt 1, available', () => {
    expect(plan).toMatchObject({
      batchNo: expectedOf('batch-clean').proposedBatchNo,
      attemptNo: 1,
      batchNoAvailable: true,
    })
  })

  it('has a movement per row and cycle: 450 E, 10 I, 320 R, each with its sheet and row', () => {
    const count = (cycle: string) => plan.movements.filter((m) => m.cycle === cycle).length
    expect({ E: count('E'), I: count('I'), R: count('R') }).toEqual(byCycle)
    expect(plan.movements.every((m) => m.sheetId && m.rowNo > 1)).toBe(true)
  })

  it('totals qty and amounts as the summary of the oracle (RDR included)', () => {
    expect(Object.fromEntries(plan.summary.totals.map((t) => [t.category, t.qty]))).toEqual({
      deposit: expected.qty.deposit,
      declined: expected.qty.declined,
      chargeback: expected.qty.chargeback,
      refund: expected.qty.refund,
      rdr: expected.qty.rdr,
    })
    expect(plan.summary.reservesReleasedQty).toBe(expected.qty.reservesReleased)
    expect(total(plan, 'deposit').amount).toBe(expected.amounts.deposit)
    expect(total(plan, 'chargeback').amount).toBe(expected.amounts.chargeback)
    expect(total(plan, 'refund').amount).toBe(expected.amounts.refund)
    expect(total(plan, 'rdr').amount).toBe(expected.amounts.rdr)
  })

  it('holds and releases the reserves of the oracle, at 4 decimals', () => {
    expect(plan.summary.reserveHeldAmt).toBe(expected.amounts.reserveHeld)
    expect(plan.summary.reserveReleasedAmt).toBe(expected.amounts.reserveReleased)
  })

  it('confirms the two pre-filled batch fees: otherFeeAmt 40.0000', () => {
    expect(plan.batchFeeError).toBeNull()
    expect(plan.batchFees.map((f) => [f.code, f.amount, f.source])).toEqual([
      ['Wire Fee', '25.0000', 'file'],
      ['Settlement Fee', '15.0000', 'file'],
    ])
    expect(plan.summary.otherFeeAmt).toBe(expected.otherFeeAmt)
  })

  it('skips only the 3 rows without ID, and asks to assign RAM-07 (expected.warnings.newChannels)', () => {
    expect(plan.skipped).toEqual({
      ignored: 3,
      unmatched: 0,
      ambiguous: 0,
      excluded: 0,
      unresolvedStatus: 0,
      pending: 0,
    })
    expect(plan.channels.toAssign.map((c) => [c.name, c.assignment])).toEqual([['RAM-07', 'unassigned']])
  })

  it('warns that the transactional fees are not computed yet, and nothing else', () => {
    expect(plan.warnings).toEqual([{ code: 'transactional_fees_not_computed' }])
  })

  it('carries the nine lines of the payable breakdown, the batch fees line at 40.0000', () => {
    expect(plan.summary.payableBreakdown).toHaveLength(9)
    expect(plan.summary.payableBreakdown.find((l) => l.code === 'batch_fees')?.amount).toBe('40.0000')
  })
})

describe('batch-issues (release_on_chargeback) against expected.reserveEarlyRelease', async () => {
  interface ReserveEarlyRelease {
    released: { id: string; sheet: string; amount: string; heldInBatchNo: number | null }[]
    notReleased: { id: string; sheet: string; outcome: string }[]
    reserveEarlyReleasedAmt: string
  }
  const expected = expectedOf('batch-issues').reserveEarlyRelease as unknown as ReserveEarlyRelease
  const sample = await settlementSampleInput('batch-issues')
  const plan = computeSettlement(sample)
  const sheetName = await sampleSheetNames('batch-issues')
  const adjustments = plan.movements.filter((m) => m.cycle === 'I')
  const adjustment = (id: string, sheet: string) => {
    const found = adjustments.filter((m) => m.sourceTransactionId === id && sheetName.get(m.sheetId) === sheet)
    expect(found, `${sheet} ${id}`).toHaveLength(1)
    return found[0]!
  }
  const snapshotOf = (m: (typeof adjustments)[number]) => JSON.parse(m.reservePolicySnapshot!)
  const cents = (amount: string) => BigInt(amount.replace('.', '').replace('-', ''))

  it('has one I movement per row of the oracle, released or not', () => {
    expect(adjustments).toHaveLength(expected.released.length + expected.notReleased.length)
  })

  it('releases the whole reserve of each released adjustment, with the batch that held it', () => {
    for (const r of expected.released) {
      const m = adjustment(r.id, r.sheet)
      expect(m.reserveEarlyReleasedAmt, `${r.sheet} ${r.id}`).toBe(r.amount)
      expect(snapshotOf(m), `${r.sheet} ${r.id}`).toEqual({
        policy: 'release_on_chargeback',
        applied: true,
        outcome: 'released',
        heldInBatchId: r.heldInBatchNo === null ? null : `batch:ProviderB-Main:${r.heldInBatchNo}:1`,
      })
    }
  })

  it('releases 0 for the others, with their outcome (RAM-13: no_held_reserve)', () => {
    expect(expected.notReleased.length).toBeGreaterThan(0)
    for (const r of expected.notReleased) {
      const m = adjustment(r.id, r.sheet)
      expect(m.reserveEarlyReleasedAmt).toBe('0.0000')
      expect(snapshotOf(m).outcome).toBe(r.outcome)
    }
  })

  it('totals the release in the summary and in the reserve_early_released line, and the breakdown sums to amountPayable', () => {
    expect(plan.summary.reserveEarlyReleasedAmt).toBe(expected.reserveEarlyReleasedAmt)
    const line = plan.summary.payableBreakdown.find((l) => l.code === 'reserve_early_released')!
    expect(line).toMatchObject({ amount: expected.reserveEarlyReleasedAmt, sign: '+' })
    const signed = plan.summary.payableBreakdown.reduce(
      (s, l) => (l.sign === '+' ? s + cents(l.amount) : s - cents(l.amount)),
      0n,
    )
    const payable = plan.summary.amountPayable
    expect(signed).toBe(payable.startsWith('-') ? -cents(payable) : cents(payable))
  })

  it('no longer warns chargeback_reserve_policy_not_applied, nor reserve_already_released', () => {
    expect(plan.warnings.map((w) => w.code)).not.toContain('chargeback_reserve_policy_not_applied')
    expect(plan.warnings.map((w) => w.code)).not.toContain('reserve_already_released')
  })
})

describe('legacy-provider against its expected.json', async () => {
  const expected = summaryOf('legacy-provider')
  const plan = computeSettlement(await settlementSampleInput('legacy-provider'))

  it('counts the CHB 2 in the chargeback qty and keeps its amount out', () => {
    expect(total(plan, 'chargeback')).toMatchObject({
      qty: expected.qty.chargeback,
      amount: expected.amounts.chargeback,
    })
    expect(plan.movements.filter((m) => m.excludeAmount).map((m) => m.sourceTransactionId)).toEqual(
      expectedOf('legacy-provider').excludeAmountRows,
    )
  })

  it('totals deposits and reserves as the oracle', () => {
    expect(total(plan, 'deposit')).toMatchObject({ qty: expected.qty.deposit, amount: expected.amounts.deposit })
    expect(total(plan, 'declined').qty).toBe(expected.qty.declined)
    expect(plan.summary.reserveHeldAmt).toBe(expected.amounts.reserveHeld)
    expect(plan.summary.otherFeeAmt).toBe(expected.otherFeeAmt)
  })
})

describe('with the transactional fees (group 11) against the oracles', async () => {
  interface Fees {
    fees: Record<string, string>
    amountPayable: string
  }
  const withFees = (name: 'batch-clean' | 'legacy-provider') =>
    settlementSampleInput(name).then((i) => computeSettlement({ ...i, options: { transactionalFees: true } }))
  const clean = await withFees('batch-clean')
  const legacy = await withFees('legacy-provider')
  const feesOf = (plan: ReturnType<typeof computeSettlement>) =>
    Object.fromEntries(plan.summary.totals.map((t) => [t.category, t.feeAmount]))

  it('batch-clean: fees by category, their total and the amount payable of expected.summary', () => {
    const expected = expectedOf('batch-clean').summary as unknown as Fees
    const { mdrIncludedInDeposit: _, total, ...byCategory } = expected.fees

    expect(feesOf(clean)).toEqual(byCategory)
    expect(clean.summary.transactionalFeeAmt).toBe(total)
    expect(clean.summary.amountPayable).toBe(expected.amountPayable)
    expect(clean.warnings).toEqual([])
  })

  it('every movement fee is the sum of its detail rows', () => {
    for (const m of clean.movements) {
      const detail = m.fees.reduce((s, f) => s + BigInt(f.amount.replace('.', '')), 0n)
      expect(BigInt(m.feeAmount.replace('.', '')) === detail, `${m.sheetId}:${m.rowNo}`).toBe(true)
    }
  })

  it('legacy-provider: the CHB 2 gets the Chargeback fee of ProviderC-Alt, as expected.summary says', () => {
    const expected = expectedOf('legacy-provider').summary as unknown as Fees

    expect(feesOf(legacy).chargeback).toBe(expected.fees.chargeback)
    expect(legacy.summary.transactionalFeeAmt).toBe(expected.fees.total)
    expect(legacy.summary.amountPayable).toBe(expected.amountPayable)
  })

  it('batch-clean with batchFees: [] pays the 40.0000 of the batch fees back (spec "Totales y amount payable")', async () => {
    const expected = expectedOf('batch-clean').summary as unknown as Fees
    const sample = await settlementSampleInput('batch-clean')
    const none = computeSettlement({
      ...sample,
      request: { ...sample.request, batchFees: [] },
      options: { transactionalFees: true },
    })

    expect(none.summary.otherFeeAmt).toBe('0.0000')
    expect(none.summary.amountPayable).toBe(new Prisma.Decimal(expected.amountPayable).plus('40.0000').toFixed(4))
  })
})

describe('an undated adjustment with the transactional fees (P6b)', () => {
  const chargeback = txn({ transactionId: 5n, statusCode: 'Chargeback' })
  const undated = (fees: ReturnType<typeof fee>[]) =>
    computeSettlement(
      input({
        fees,
        rows: [row(2, { cycle: 'I', statusCode: 'Chargeback' }, chargeback)],
        options: { transactionalFees: true },
      }),
    )

  it('carries feeSkipped: true in its warning when the fees of its type are dated', () => {
    const plan = undated([fee({ feeTypeId: 4, fixedAmount: '40.0000', endDate: '2026-10-31' })])

    expect(plan.warnings).toContainEqual(expect.objectContaining({ code: 'undated_adjustment', feeSkipped: true }))
  })

  it('carries feeSkipped: false when it got the only NULL…NULL fee of its type', () => {
    const plan = undated([fee({ feeTypeId: 4, fixedAmount: '40.0000' })])

    expect(plan.warnings).toContainEqual(expect.objectContaining({ code: 'undated_adjustment', feeSkipped: false }))
    expect(plan.movements[0]!.feeAmount).toBe('40.0000')
  })
})

describe('computeSettlement', () => {
  it('uses the batchNo of the request and tells whether it is available', () => {
    const attempts = [{ batchNo: 118, attemptNo: 1, status: 'processed' as const, importId: 'other' }]

    const taken = computeSettlement(input({ attempts, request: { batchNo: 118 } }))
    const free = computeSettlement(input({ attempts, request: { batchNo: 119 } }))

    expect(taken).toMatchObject({ batchNo: 118, attemptNo: 2, batchNoAvailable: false, holder: attempts[0] })
    expect(free).toMatchObject({ batchNo: 119, attemptNo: 1, batchNoAvailable: true, holder: null })
  })

  it('reports the first invalid batch fee instead of failing', () => {
    const plan = computeSettlement(
      input({
        request: { batchFees: [{ feeTypeId: 121, feeId: null, amount: '1', source: 'manual', description: 'x' }] },
      }),
    )

    expect(plan.batchFeeError).toEqual({ index: 0, reason: 'free_amount_not_allowed' })
  })

  it('warns reserve_cap_not_applied for an account with a cap, and no longer chargeback_reserve_policy_not_applied (#62)', () => {
    const changed = new Date('2026-10-03T08:00:00.000Z')
    const chargeback = txn({ transactionId: 5n, statusCode: 'Chargeback', lastStatusChangedAt: changed })
    const plan = computeSettlement(
      input({
        account: {
          ...input().account,
          chargebackReservePolicy: 'release_on_chargeback',
          rollingReserveCapAmt: '50000.0000',
        },
        rows: [row(2, { cycle: 'I', statusCode: 'Chargeback' }, chargeback)],
      }),
    )

    expect(plan.warnings.map((w) => w.code)).toEqual(['transactional_fees_not_computed', 'reserve_cap_not_applied'])
  })

  it('applies the reserve policy after building the movements: the I releases the reserve its E held (round 1)', () => {
    const changed = new Date('2026-10-03T08:00:00.000Z')
    const refunded = txn({ transactionId: 5n, statusCode: 'Refund', amount: '123.4565', lastStatusChangedAt: changed })
    const plan = computeSettlement(
      input({
        account: { ...input().account, chargebackReservePolicy: 'release_on_chargeback' },
        rows: [row(2, {}, refunded), row(3, { cycle: 'I', statusCode: 'Refund' }, refunded)],
      }),
    )

    expect(plan.movements.map((m) => [m.cycle, m.reserveHeldAmt, m.reserveEarlyReleasedAmt])).toEqual([
      ['E', '12.3457', '0.0000'],
      ['I', '0.0000', '12.3457'],
    ])
    expect(plan.summary.reserveEarlyReleasedAmt).toBe('12.3457')
  })

  it('carries the date ranges of the run and the channel label of the movements', () => {
    const APP = { min: new Date('2026-09-28T00:00:00.000Z'), max: new Date('2026-10-07T00:00:00.000Z') }
    const plan = computeSettlement(input({ ranges: { APP, DEC: null, I: null, R: null }, rows: [row(2)] }))

    expect(plan.dateRanges.APP).toEqual(APP)
    expect(plan.channels).toEqual({ names: ['RAM-01'], label: 'RAM-01', toAssign: [] })
  })
})

describe('a row of another provider in the engine input (#92, design D5)', () => {
  it('makes the computation fail: no movement and no channel to assign is planned', () => {
    const foreign = row(3, {}, txn({ transactionId: 30n, providerId: 102, channelId: 1011 }))

    expect(() => computeSettlement(input({ rows: [row(2), foreign] }))).toThrow(/another provider/)
  })

  it('batch-clean has none: it computes as always, with the six reasons of skipped', async () => {
    const plan = computeSettlement(await settlementSampleInput('batch-clean'))

    expect(Object.keys(plan.skipped)).toEqual([
      'ignored',
      'unmatched',
      'ambiguous',
      'excluded',
      'unresolvedStatus',
      'pending',
    ])
  })
})
