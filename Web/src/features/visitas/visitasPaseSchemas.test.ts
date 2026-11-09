import { describe, expect, it } from 'vitest'
import { whatsAppShareHref } from './visitasPaseSchemas'

describe('whatsAppShareHref', () => {
  it('includes codigoQR in wa.me link', () => {
    const pase = {
      fechaEmision: '2026-10-28T00:00:00Z',
      fechaExpira: '2026-10-28T20:00:00Z',
      unaOcasion: true,
    }
    const href = whatsAppShareHref('DEADBEEF00112233', pase)
    expect(href).toContain('https://wa.me/?text=')
    expect(decodeURIComponent(href.split('text=')[1] ?? '')).toContain('DEADBEEF00112233')
  })
})
