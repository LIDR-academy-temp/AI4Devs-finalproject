// Run with `node --test support/` from e2e/ (design D11). The figures come from the JSON read here, never written.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { expectedOf, formatAmount, outcomeOf, sameDecimal, sampleFile } from './expected.ts'

const raw = (sample: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../data/samples/${sample}/expected.json`, import.meta.url)), 'utf8'),
  )

describe('expectedOf', () => {
  it('reads the oracle of batch-clean as it is in data/samples', () => {
    const json = raw('batch-clean')
    const expected = expectedOf('batch-clean')
    assert.equal(expected.rows.read, json.rows.read)
    assert.equal(expected.rows.matched, json.rows.matched)
    assert.equal(expected.proposedBatchNo, json.proposedBatchNo)
    assert.equal(expected.summary?.amountPayable, json.summary.amountPayable)
    assert.deepEqual(expected.warnings?.newChannels, json.warnings.newChannels)
  })

  it('reads the affected IDs of batch-blocked', () => {
    assert.deepEqual(
      expectedOf('batch-blocked').affectedIds?.provider_mismatch,
      raw('batch-blocked').affectedIds.provider_mismatch,
    )
  })

  it('reads the ranges, the ambiguous and empty-ID rows of batch-clean and the outcomes of batch-wrong-account', () => {
    const clean = raw('batch-clean')
    const expected = expectedOf('batch-clean')
    assert.deepEqual(expected.ranges, clean.ranges)
    assert.equal(expected.rows.ambiguous, clean.rows.ambiguous)
    assert.equal(expected.rows.ignoredEmptyId, clean.rows.ignoredEmptyId)
    assert.deepEqual(expectedOf('batch-wrong-account').outcomes, raw('batch-wrong-account').outcomes)
  })

  it('names the path of a sample that does not exist', () => {
    assert.throws(() => expectedOf('batch-nowhere'), /data[\\/]samples[\\/]batch-nowhere[\\/]expected\.json/)
  })

  it('gives the path of each file of the sample, in the order of expected.json', () => {
    const files = raw('batch-split').files as string[]
    assert.deepEqual(
      expectedOf('batch-split').files.map((file) => sampleFile('batch-split', file)),
      files.map((file) => `data/samples/batch-split/${file}`),
    )
  })
})

describe('formatAmount', () => {
  it('groups the thousands and keeps the four decimals, as the screens do', () => {
    assert.equal(formatAmount('33771.3600'), '33,771.3600')
    assert.equal(formatAmount('1234567.8900'), '1,234,567.8900')
  })

  it('keeps small amounts, zeros and negatives', () => {
    assert.equal(formatAmount('427.5100'), '427.5100')
    assert.equal(formatAmount('0.0000'), '0.0000')
    assert.equal(formatAmount('-25.0000'), '-25.0000')
    assert.equal(formatAmount('-1234.5000'), '-1,234.5000')
  })
})

describe('sameDecimal', () => {
  it('compares decimal texts by their digits, whatever the trailing zeros', () => {
    assert.ok(sameDecimal('25.0000', '25'))
    assert.ok(sameDecimal('15.5', '15.5000'))
    assert.ok(sameDecimal('0.0000', '0'))
    assert.ok(sameDecimal('-25.0000', '-25'))
  })

  it('tells different amounts apart, also a sign or a digit after the fourth decimal', () => {
    assert.ok(!sameDecimal('25.0000', '15'))
    assert.ok(!sameDecimal('-25.0000', '25'))
    assert.ok(!sameDecimal('25.00001', '25'))
    assert.ok(!sameDecimal('250', '25'))
  })

  it('does not take what is not a decimal', () => {
    assert.ok(!sameDecimal('', '0'))
    assert.ok(!sameDecimal('25,00', '25'))
  })
})

describe('outcomeOf', () => {
  it('takes the outcome the oracle writes when it has one', () => {
    const outcomes = raw('batch-wrong-account').outcomes as Record<string, string>
    const expected = expectedOf('batch-wrong-account')
    for (const [code, outcome] of Object.entries(outcomes)) assert.equal(outcomeOf(expected, code, 0), outcome)
  })

  it('without outcomes in the oracle: passed without findings, warning with them', () => {
    const expected = expectedOf('batch-clean')
    assert.equal(outcomeOf(expected, 'duplicate_in_batch', 0), 'passed')
    assert.equal(outcomeOf(expected, 'duplicate_in_batch', 2), 'warning')
  })

  it('provider_mismatch with findings is blocked, the only blocking validation', () => {
    assert.equal(outcomeOf(expectedOf('batch-blocked'), 'provider_mismatch', 1), 'blocked')
    assert.equal(outcomeOf(expectedOf('batch-clean'), 'provider_mismatch', 0), 'passed')
  })
})
