import { describe, expect, it } from 'vitest'
import { isSettled, settledStatusOf } from './settled.js'

// Spec settlement "Settled derivado del intento en las lecturas": only a paid attempt is Settled.
describe('settledStatusOf and isSettled', () => {
  it('derives the payment from the attempt status', () => {
    expect(settledStatusOf('processed')).toBe('pending_payment')
    expect(settledStatusOf('paid')).toBe('settled')
    expect(settledStatusOf('undone')).toBe('undone')
  })

  it('is Settled only when paid', () => {
    expect([isSettled('processed'), isSettled('paid'), isSettled('undone')]).toEqual([false, true, false])
  })
})
