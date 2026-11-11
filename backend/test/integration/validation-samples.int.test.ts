import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { type ValidationIssueSummary, ValidationIssuesPage, ValidationRunView } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from './helpers.js'
import { expectedOf, ImportFlow, type SampleName } from './import-flow.js'

// Spec "Corrida contra la base igual al oráculo": every sample uploaded, mapped with the proposal, analyzed and validated
// through the API on the seeded database, against its expected.json read from disk (counts, affected IDs, blocked and,
// where the oracle has them, the ranges). The same assertions as the engine's oracles.test.ts, over the stored run.
interface Expected {
  validations: Record<string, number | Record<string, number>>
  affectedIds?: Record<string, string[] | string>
  blocked?: boolean
  ranges?: Record<string, [string, string]>
}

const SAMPLES: SampleName[] = ['batch-clean', 'batch-split', 'batch-issues', 'batch-blocked', 'legacy-provider']
const NOT_VALIDATIONS = new Set(['unmatched', 'negativeAmount', 'foreignChannel'])

let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-validation-samples-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  flow = new ImportFlow(ctx)
  await flow.init()
})

afterAll(async () => {
  if (ctx) {
    await flow.close()
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

/** `missing_in_range_E` is by cycle, `missing_previous_to_batch_DEC` by range, as in oracles.test.ts. */
function affected(issues: ValidationIssueSummary[], key: string): ValidationIssueSummary[] {
  if (key === 'status_mismatch' || key === 'non_recorded_adjustment')
    return issues.filter((i) => i.validationCode === 'non_recorded_adjustment' && i.issueType === key)
  const missing = /^(missing_previous_to_batch|missing_in_range)_(\w+)$/.exec(key)
  if (missing) {
    const [, code, part] = missing
    return issues.filter((i) => i.validationCode === code && (part === 'E' ? i.cycle === 'E' : i.missingRange === part))
  }
  return issues.filter((i) => i.validationCode === key)
}

describe.each(SAMPLES)('%s through the API against its expected.json', (sample) => {
  const expected = expectedOf(sample) as unknown as Expected
  let view: ValidationRunView
  let issues: ValidationIssueSummary[]

  beforeAll(async () => {
    const { importId } = await flow.analyzedSample(sample)
    const res = await flow.call('POST', `/imports/${importId}/validations`)
    expect(res.statusCode, res.body).toBe(201)
    view = ValidationRunView.parse(res.json())
    const page = ValidationIssuesPage.parse(
      (await flow.call('GET', `/imports/${importId}/validation-issues?pageSize=500`)).json(),
    )
    expect(page.total).toBeLessThanOrEqual(500)
    issues = page.items
  })

  it('has the counts of expected.validations, in the results and in the stored findings', () => {
    for (const [code, value] of Object.entries(expected.validations)) {
      const result = view.run!.results.find((r) => r.validationCode === code)!
      const ofCode = issues.filter((i) => i.validationCode === code)
      if (typeof value === 'number') {
        expect(result.issueCount, code).toBe(value)
        expect(ofCode, code).toHaveLength(value)
      } else {
        const key = code === 'non_recorded_adjustment' ? 'issueType' : 'cycle'
        for (const [part, count] of Object.entries(value))
          expect(
            ofCode.filter((i) => i[key] === part),
            `${code}.${part}`,
          ).toHaveLength(count)
        expect(result.issueCount, code).toBe(Object.values(value).reduce((a, b) => a + b, 0))
      }
    }
  })

  it('has the IDs of expected.affectedIds', () => {
    for (const [key, ids] of Object.entries(expected.affectedIds ?? {})) {
      if (NOT_VALIDATIONS.has(key) || !Array.isArray(ids)) continue
      expect(
        affected(issues, key)
          .map((i) => i.transactionIdRaw)
          .sort(),
        key,
      ).toEqual([...ids].sort())
    }
  })

  it('is blocked only when the oracle says so', () => {
    expect(view.run!.blocked).toBe(expected.blocked ?? false)
    expect(view.run!.results.filter((r) => r.outcome === 'not_implemented')).toEqual([])
  })

  it.runIf(expected.ranges !== undefined)('has the ranges of expected.ranges', () => {
    for (const [range, value] of Object.entries(expected.ranges ?? {})) {
      const stored = view.run!.ranges[range as 'APP' | 'DEC' | 'I' | 'R']
      expect(stored === null ? null : [stored.min.slice(0, 10), stored.max.slice(0, 10)], range).toEqual(value)
    }
  })
})
