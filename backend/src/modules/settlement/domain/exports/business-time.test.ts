import { describe, expect, it } from 'vitest'
import { businessTime } from './business-time.js'

// Spec settlement "Summary del merchant", scenario "Fechas del summary": business dates are New York wall time whose Z
// is transport only (debt #48), so they are written without converting (design D7).
describe('businessTime', () => {
  it('writes the digits as they arrive', () => {
    expect(businessTime('2026-10-07T23:58:40.000Z')).toBe('2026-10-07 23:58:40')
  })

  it('does not move a date near midnight to another day', () => {
    expect(businessTime('2026-09-28T00:04:11.000Z')).toBe('2026-09-28 00:04:11')
  })

  it('does not apply the daylight saving offset in winter either', () => {
    expect(businessTime('2026-12-15T15:40:03.000Z')).toBe('2026-12-15 15:40:03')
  })

  it('drops the milliseconds', () => {
    expect(businessTime('2026-10-07T23:58:40.999Z')).toBe('2026-10-07 23:58:40')
  })
})
