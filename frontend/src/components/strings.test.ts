import { describe, expect, it } from 'vitest'
import { strings as imports } from '@/features/imports/strings'
import { strings as settlements } from '@/features/settlements/strings'
import { strings as validations } from '@/features/validations/strings'
import { strings } from './strings'

// #139: the wrong-account sentence is defined once, in the shared layer, and each feature reads it from there.
describe('the wrong-account sentence', () => {
  it('is the one of the shared components', () => {
    expect(strings.wrongAccount).toBe(
      'The IDs do not fit any gateway of this account: the files may belong to another account.',
    )
  })

  it('Analysis and Settlement Review show it as it is', () => {
    expect(imports.analysis.counters.wrongAccount).toBe(strings.wrongAccount)
    expect(settlements.emptyBatch.wrongAccount).toBe(strings.wrongAccount)
  })

  it('the DecisionBar follows it with its own action', () => {
    expect(validations.decision.emptyBatch.wrongAccountAction).toBe('Cancel and reprocess under the right account.')
    expect(validations.decision.emptyBatch.wrongAccount).toBe(
      `${strings.wrongAccount} ${validations.decision.emptyBatch.wrongAccountAction}`,
    )
  })
})
