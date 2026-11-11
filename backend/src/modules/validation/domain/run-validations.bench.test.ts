import { describe, expect, it } from 'vitest'
import { BENCH, benchInput } from '../test-support/bench-input.js'
import { runValidations } from './run-validations.js'

// Spec "Rendimiento del motor" (design D8): 2 000 rows against 50 000 movements. The gate is < 2 s locally (noted in
// design D8 and in the PR); the assertion keeps a CI margin (< 4 s) so the test is not flaky.
describe('runValidations at the reference volume', () => {
  const { input } = benchInput()

  it('has the reference volume', () => {
    expect(input.rows).toHaveLength(BENCH.rows)
    expect(input.history).toHaveLength(BENCH.movements)
    expect(new Set(input.history.map((m) => m.batchId)).size).toBe(BENCH.batches - 1)
    expect(input.candidates).toHaveLength(BENCH.candidates)
  })

  it('runs the eight validations in under 4 s (CI margin; the local gate is 2 s)', () => {
    runValidations(input) // warm-up
    const started = performance.now()
    const report = runValidations(input)
    const elapsed = performance.now() - started
    process.stdout.write(
      `[bench] runValidations: ${elapsed.toFixed(1)} ms (${BENCH.rows} rows × ${BENCH.movements} movements)\n`,
    )

    expect(report.results).toHaveLength(8)
    expect(elapsed).toBeLessThan(4_000)
  })
})
