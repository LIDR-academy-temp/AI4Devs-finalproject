import { expect, test } from 'vitest'
import { formatPages, formatSize, statusLabel } from './format'

test.each([
  [800, '800 B'],
  [1024, '1 KB'],
  [250_880, '245 KB'],
  [1_258_291, '1,2 MB'],
  [10 * 1024 * 1024, '10 MB'],
])('formatSize(%i) = %s', (bytes, expected) => {
  expect(formatSize(bytes)).toBe(expected)
})

test.each([
  [1, '1 página'],
  [3, '3 páginas'],
])('formatPages(%i) = %s', (pages, expected) => {
  expect(formatPages(pages)).toBe(expected)
})

test.each([
  ['pending', 'Pendiente de firma'],
  ['signing', 'Firmando'],
  ['signed', 'Firmado'],
  ['failed', 'Firma fallida'],
] as const)('statusLabel(%s) = %s', (status, expected) => {
  expect(statusLabel(status)).toBe(expected)
})
