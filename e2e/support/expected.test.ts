// Run with `node --test support/` from e2e/ (design D11). The figures come from the JSON read here, never written.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { expectedOf, formatAmount, sampleFile } from './expected.ts'

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
