import { describe, expect, it } from 'vitest'
import { safeRedirect } from './redirect'

describe('safeRedirect', () => {
  it('keeps a route of the application with its search and hash', () => {
    expect(safeRedirect('/accounts?merchantId=1&providerId=101#top')).toBe('/accounts?merchantId=1&providerId=101#top')
  })

  it('keeps only the path of an absolute address of the same origin', () => {
    expect(safeRedirect(`${window.location.origin}/accounts?merchantId=1`)).toBe('/accounts?merchantId=1')
  })

  it.each([
    ['a protocol-relative address', '//evil.example/phish'],
    ['a backslash the browser reads as a slash', '/\\evil.example'],
    ['an absolute address of another origin', 'https://evil.example'],
    ['a tab the URL parser strips', '/\t/evil.example'],
    ['a javascript: address', 'javascript:alert(1)'],
  ])('rejects %s', (_, target) => {
    expect(safeRedirect(target)).toBeUndefined()
  })

  it('rejects a missing or empty target', () => {
    expect(safeRedirect(undefined)).toBeUndefined()
    expect(safeRedirect('')).toBeUndefined()
  })
})
