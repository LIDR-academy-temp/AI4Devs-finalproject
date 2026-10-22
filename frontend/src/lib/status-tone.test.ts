import { describe, expect, it } from 'vitest'
import {
  BATCH_STATUS_TONE,
  IMPORT_STATUS_TONE,
  RUN_OVERALL_TONE,
  SETTLED_STATUS_TONE,
  toneOf,
  VALIDATION_OUTCOME_TONE,
} from './status-tone'

// Spec web-shell "Colores de estado"; the colour answers "is anything still pending?" (design D8).
describe('status tones', () => {
  it('validation outcome', () => {
    expect(VALIDATION_OUTCOME_TONE).toEqual({
      passed: 'success',
      warning: 'warning',
      blocked: 'danger',
      not_applicable: 'neutral',
      not_implemented: 'neutral',
    })
  })

  it('overall state of the run', () => {
    expect(RUN_OVERALL_TONE).toEqual({ passed: 'success', warnings: 'warning', blocked: 'danger' })
  })

  it('import status', () => {
    expect(IMPORT_STATUS_TONE).toEqual({
      uploaded: 'neutral',
      mapped: 'neutral',
      analyzed: 'neutral',
      validated: 'success',
      processed: 'success',
      cancelled: 'neutral',
    })
  })

  it('batch status', () => {
    expect(BATCH_STATUS_TONE).toEqual({ processed: 'warning', paid: 'success', undone: 'neutral' })
  })

  it('settled status', () => {
    expect(SETTLED_STATUS_TONE).toEqual({ pending_payment: 'warning', settled: 'success', undone: 'neutral' })
  })

  it('looks a value up in its map', () => {
    expect(toneOf(BATCH_STATUS_TONE, 'paid')).toBe('success')
    expect(toneOf(VALIDATION_OUTCOME_TONE, 'blocked')).toBe('danger')
  })

  it('a value that is not in the map is neutral, never without a colour', () => {
    expect(toneOf(IMPORT_STATUS_TONE, 'reopened')).toBe('neutral')
    expect(toneOf(BATCH_STATUS_TONE, 'toString')).toBe('neutral')
  })
})
