import { describe, expect, it } from 'vitest'
import { ACCOUNT_B, at, row, STATUSES } from '../test-support/builders.js'
import { sampleInput } from '../test-support/sample-input.js'
import { computeRanges } from './ranges.js'
import type { DateRange } from './types.js'

// Spec "Rangos y faltantes" and "Filas que forman cada rango" (design D6; questions 1 and 11).
const days = (range: DateRange | null) =>
  range === null ? null : [range.min.toISOString().slice(0, 10), range.max.toISOString().slice(0, 10)]

describe('computeRanges', () => {
  it('batch-clean: the four ranges of expected.ranges, by day', async () => {
    const { input } = await sampleInput('batch-clean')
    const { ranges } = computeRanges(input.rows, input.account, input.statuses)

    expect(days(ranges.APP)).toEqual(['2026-09-28', '2026-10-07'])
    expect(days(ranges.DEC)).toEqual(['2026-09-28', '2026-10-07'])
    expect(days(ranges.I)).toEqual(['2026-09-28', '2026-10-11'])
    expect(days(ranges.R)).toEqual(['2026-03-31', '2026-04-09'])
  })

  it('batch-issues: DEC starts on 2026-09-29 although a DEC row is a Successful of the previous window (question 1)', async () => {
    const { input } = await sampleInput('batch-issues')
    const { ranges } = computeRanges(input.rows, input.account, input.statuses)

    expect(days(ranges.DEC)?.[0]).toBe('2026-09-29')
  })

  it('APP takes the E rows whose gateway is not Declined nor Pending (a Chargeback was born Successful)', () => {
    const { ranges } = computeRanges(
      [
        row({ transactionId: 1n, gateway: 'Chargeback', date: at('2026-09-01T10:00:00.000Z') }),
        row({ transactionId: 2n, date: at('2026-09-05T10:00:00.000Z') }),
        row({ transactionId: 3n, gateway: 'Pending', date: at('2026-08-01T10:00:00.000Z') }),
        row({ transactionId: 4n, status: 'Successful', gateway: 'Declined', date: at('2026-08-02T10:00:00.000Z') }),
      ],
      ACCOUNT_B,
      STATUSES,
    )

    expect(ranges.APP).toEqual({ min: at('2026-09-01T10:00:00.000Z'), max: at('2026-09-05T10:00:00.000Z') })
    expect(ranges.DEC).toEqual({ min: at('2026-08-02T10:00:00.000Z'), max: at('2026-08-02T10:00:00.000Z') })
  })

  it('without any Declined in the gateway there is no DEC range', () => {
    expect(computeRanges([row({ status: 'Successful' })], ACCOUNT_B, STATUSES).ranges.DEC).toBeNull()
  })

  it('I uses the date of the status change when the gateway holds the row status', () => {
    const { ranges, undatedAdjustmentCount } = computeRanges(
      [row({ cycle: 'I', status: 'Refund', gateway: 'Refund', changedAt: at('2026-10-03T08:00:00.000Z') })],
      ACCOUNT_B,
      STATUSES,
    )

    expect(ranges.I).toEqual({ min: at('2026-10-03T08:00:00.000Z'), max: at('2026-10-03T08:00:00.000Z') })
    expect(undatedAdjustmentCount).toBe(0)
  })

  it('an I row with another gateway status, or without lastStatusChangedAt, adds no date and counts as undated (question 11)', () => {
    const { ranges, undatedAdjustmentCount } = computeRanges(
      [
        row({ transactionId: 1n, cycle: 'I', status: 'Chargeback', gateway: 'Successful' }),
        row({
          transactionId: 2n,
          cycle: 'I',
          status: 'Chargeback',
          gateway: 'Refund',
          changedAt: at('2026-10-01T00:00:00.000Z'),
        }),
        row({ transactionId: 3n, cycle: 'I', status: 'Refund', gateway: 'Refund', changedAt: null }),
      ],
      ACCOUNT_B,
      STATUSES,
    )

    expect(ranges.I).toBeNull()
    expect(undatedAdjustmentCount).toBe(3)
  })

  it('R uses the expiry date: creation + rollingReserveDays of the channel of each row (180 and 120 days)', () => {
    const { ranges } = computeRanges(
      [
        row({
          transactionId: 1n,
          cycle: 'R',
          status: 'Successful',
          channelId: 1011,
          date: at('2026-04-01T09:00:00.000Z'),
        }),
        row({
          transactionId: 2n,
          cycle: 'R',
          status: 'Successful',
          channelId: 1013,
          date: at('2026-06-01T09:00:00.000Z'),
        }),
      ],
      ACCOUNT_B,
      STATUSES,
    )

    // 2026-04-01 + 180 d = 2026-09-28; 2026-06-01 + 120 d = 2026-09-29
    expect(ranges.R).toEqual({ min: at('2026-09-28T09:00:00.000Z'), max: at('2026-09-29T09:00:00.000Z') })
  })

  it('foreign and unmatched rows do not widen the ranges', () => {
    const { ranges } = computeRanges(
      [
        row({ transactionId: 1n, date: at('2026-09-10T00:00:00.000Z') }),
        row({ transactionId: 2n, providerId: 101, channelId: 1001, date: at('2026-01-01T00:00:00.000Z') }),
        row({ transactionId: 3n, matchResult: 'unmatched' }),
      ],
      ACCOUNT_B,
      STATUSES,
    )

    expect(ranges.APP).toEqual({ min: at('2026-09-10T00:00:00.000Z'), max: at('2026-09-10T00:00:00.000Z') })
  })
})
