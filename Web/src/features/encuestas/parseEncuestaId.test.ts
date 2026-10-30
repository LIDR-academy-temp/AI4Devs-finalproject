import { describe, expect, it } from 'vitest'
import { parseEncuestaId } from './parseEncuestaId'

describe('parseEncuestaId', () => {
  it('rechaza undefined literal de ruta', () => {
    expect(parseEncuestaId('undefined')).toBeUndefined()
  })

  it('acepta id numérico válido', () => {
    expect(parseEncuestaId('12')).toBe(12)
  })
})
