import { describe, expect, it } from 'vitest'
import { whatsAppShareHref } from './visitasPaseSchemas'

describe('whatsAppShareHref', () => {
  it('includes codigoQR in wa.me link', () => {
    const href = whatsAppShareHref('DEADBEEF00112233', '2026-10-28T20:00:00Z')
    expect(href).toContain('https://wa.me/?text=')
    expect(decodeURIComponent(href.split('text=')[1] ?? '')).toContain('DEADBEEF00112233')
  })
})
