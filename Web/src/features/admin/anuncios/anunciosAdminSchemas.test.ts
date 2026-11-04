import { describe, expect, it } from 'vitest'
import { vigenteHastaToIso } from './anunciosAdminSchemas'

describe('vigenteHastaToIso', () => {
  it('usa fin del dia local para input type=date', () => {
    const iso = vigenteHastaToIso('2026-11-04')
    expect(iso).not.toBeNull()
    const parsed = new Date(iso!)
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(10)
    expect(parsed.getDate()).toBe(4)
    expect(parsed.getHours()).toBe(23)
  })

  it('devuelve null si vacio', () => {
    expect(vigenteHastaToIso('')).toBeNull()
    expect(vigenteHastaToIso('   ')).toBeNull()
  })
})
