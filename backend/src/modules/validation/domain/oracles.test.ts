import type { ValidationCode } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { countBy, expectedOf, resultOf } from '../test-support/builders.js'
import { type SampleName, sampleInput } from '../test-support/sample-input.js'
import { runValidations } from './run-validations.js'
import type { DateRange, Issue } from './types.js'

// Spec "Muestras sin base de datos": every sample against its expected.json, read from disk. Counts per validation
// (per cycle for the missing ones, per issueType for non_recorded_adjustment), the affected IDs, `blocked` and, where
// the oracle has them, the ranges. batch-blocked only asserts what its oracle says: provider_mismatch and blocked.
interface Expected {
  validations: Record<string, number | Record<string, number>>
  affectedIds?: Record<string, string[] | string>
  blocked?: boolean
  ranges?: Record<string, [string, string]>
}

const SAMPLES: SampleName[] = ['batch-clean', 'batch-split', 'batch-issues', 'batch-blocked', 'legacy-provider']
const NOT_VALIDATIONS = new Set(['unmatched', 'negativeAmount', 'foreignChannel'])
const CYCLES = new Set(['E', 'I', 'R'])

const raws = (issues: Issue[]) => issues.map((i) => i.transactionIdRaw).sort()
const days = (range: DateRange | null) =>
  range === null ? null : [range.min.toISOString().slice(0, 10), range.max.toISOString().slice(0, 10)]

/** `missing_in_range_E` is by cycle, `missing_previous_to_batch_DEC` by range: E is only a cycle, APP/DEC only ranges. */
function affected(report: ReturnType<typeof runValidations>, key: string): Issue[] {
  if (key === 'status_mismatch' || key === 'non_recorded_adjustment')
    return resultOf(report, 'non_recorded_adjustment').issues.filter((i) => i.issueType === key)
  const missing = /^(missing_previous_to_batch|missing_in_range)_(\w+)$/.exec(key)
  if (missing) {
    const [, code, part] = missing
    const issues = resultOf(report, code as ValidationCode).issues
    return issues.filter((i) => (part === 'E' ? i.cycle === 'E' : i.missingRange === part))
  }
  return resultOf(report, key as ValidationCode).issues
}

describe.each(SAMPLES)('%s against its expected.json', (name) => {
  const expected = expectedOf(name) as unknown as Expected

  it('has the counts of expected.validations', async () => {
    const report = runValidations((await sampleInput(name)).input)

    for (const [code, value] of Object.entries(expected.validations)) {
      const result = resultOf(report, code as ValidationCode)
      if (typeof value === 'number') {
        expect(result.issueCount, code).toBe(value)
      } else {
        const by = code === 'non_recorded_adjustment' ? 'issueType' : 'cycle'
        const counts = countBy(result, by)
        for (const [part, count] of Object.entries(value)) expect(counts[part] ?? 0, `${code}.${part}`).toBe(count)
        expect(result.issueCount, code).toBe(Object.values(value).reduce((a, b) => a + b, 0))
      }
    }
  })

  it('has the IDs of expected.affectedIds', async () => {
    const report = runValidations((await sampleInput(name)).input)

    for (const [key, ids] of Object.entries(expected.affectedIds ?? {})) {
      if (NOT_VALIDATIONS.has(key) || !Array.isArray(ids)) continue
      expect(raws(affected(report, key)), key).toEqual([...ids].sort())
    }
  })

  it('is blocked only when the oracle says so, and every validation is implemented', async () => {
    const report = runValidations((await sampleInput(name)).input)

    expect(report.blocked).toBe(expected.blocked ?? false)
    expect(report.results.filter((r) => r.outcome === 'not_implemented')).toEqual([])
    if (!expected.blocked) expect(report.results.filter((r) => r.outcome === 'blocked')).toEqual([])
  })

  it.runIf(expected.ranges !== undefined)('has the ranges of expected.ranges', async () => {
    const report = runValidations((await sampleInput(name)).input)

    for (const [range, value] of Object.entries(expected.ranges ?? {})) {
      expect(days(report.ranges[range as keyof typeof report.ranges]), range).toEqual(value)
    }
  })
})

describe('the clean samples', () => {
  it.each(['batch-clean', 'batch-split'] as const)(
    '%s: the eight are passed or not_applicable, none with findings',
    async (name) => {
      const report = runValidations((await sampleInput(name)).input)

      expect(report.results.every((r) => r.outcome === 'passed' || r.outcome === 'not_applicable')).toBe(true)
      expect(report.results.every((r) => r.issueCount === 0)).toBe(true)
    },
  )

  it('missing-cycle keys of the oracles are cycles or ranges the engine knows', () => {
    for (const name of SAMPLES) {
      const expected = expectedOf(name) as unknown as Expected
      for (const value of Object.values(expected.validations)) {
        if (typeof value === 'object')
          for (const part of Object.keys(value))
            expect(CYCLES.has(part) || part === 'non_recorded_adjustment' || part === 'status_mismatch', part).toBe(
              true,
            )
      }
    }
  })
})
