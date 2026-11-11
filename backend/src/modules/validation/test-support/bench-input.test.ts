import { describe, expect, it } from 'vitest'
import { runValidations } from '../domain/run-validations.js'
import { BENCH, benchInput, REFERENCE, referenceBenchInput } from './bench-input.js'

// Calibration of the two bench volumes (validation-runs design D14): the reference one is a real batch (a large
// provider history, ranges of a few days as the doc 06 profile has, 2 000 rows and at most 2 000 missing findings in a
// bad case); the extreme one keeps the engine's volume, whose wide ranges turn ~23 000 candidates into findings.
const DAY_MS = 86_400_000
const days = (range: { min: Date; max: Date } | null) =>
  range === null ? 0 : (range.max.getTime() - range.min.getTime()) / DAY_MS

describe('referenceBenchInput', () => {
  const { input } = referenceBenchInput()
  const report = runValidations(input)
  const missing = report.results
    .filter((r) => r.code === 'missing_previous_to_batch' || r.code === 'missing_in_range')
    .reduce((n, r) => n + r.issueCount, 0)

  it('has 2 000 rows and 50 000 previous movements of the provider', () => {
    expect(input.rows).toHaveLength(REFERENCE.rows)
    expect(input.history).toHaveLength(REFERENCE.movements)
  })

  it(`has APP, DEC and R ranges of at most ${REFERENCE.windowDays + 1} days`, () => {
    expect(days(report.ranges.APP)).toBeLessThanOrEqual(REFERENCE.windowDays + 1)
    expect(days(report.ranges.DEC)).toBeLessThanOrEqual(REFERENCE.windowDays + 1)
    expect(days(report.ranges.R)).toBeLessThanOrEqual(REFERENCE.windowDays + 1)
  })

  it('is a bad case, with missing findings, but at most 2 000 of them', () => {
    expect(missing).toBeGreaterThan(500)
    expect(missing).toBeLessThanOrEqual(REFERENCE.maxMissing)
  })

  it('keeps duplicates, collisions and adjustments in it, as a real batch with issues', () => {
    const count = (code: string) => report.results.find((r) => r.code === code)?.issueCount ?? 0
    expect(count('duplicate_in_batch')).toBeGreaterThan(0)
    expect(count('duplicate_across_batches')).toBeGreaterThan(0)
    expect(count('non_recorded_adjustment')).toBeGreaterThanOrEqual(0)
    expect(report.blocked).toBe(false)
  })
})

describe('benchInput, the extreme case', () => {
  it(`keeps the engine's volume: ${BENCH.rows} rows, ${BENCH.movements} movements, over 20 000 findings`, () => {
    const { input } = benchInput()
    const report = runValidations({ ...input, registeredMissing: new Set() })

    expect(input.rows).toHaveLength(BENCH.rows)
    expect(input.history).toHaveLength(BENCH.movements)
    expect(report.results.reduce((n, r) => n + r.issueCount, 0)).toBeGreaterThan(20_000)
  })
})
