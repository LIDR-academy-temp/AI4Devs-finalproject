import { describe, expect, it } from 'vitest'
import { normalizeAutomovilListItem, vehiculoSubtitulo, vehiculoTitulo } from './vehiculoMappers'

describe('vehiculoMappers', () => {
  it('normaliza PascalCase de la API', () => {
    const v = normalizeAutomovilListItem({
      AutomovilId: 9,
      UsuarioId: 1,
      Placas: 'XYZ-99',
      Marca: 'Nissan',
      Modelo: 'March',
      Color: 'Rojo',
    })
    expect(v.automovilId).toBe(9)
    expect(v.placas).toBe('XYZ-99')
    expect(v.marca).toBe('Nissan')
  })

  it('formatea título y subtítulo', () => {
    const v = normalizeAutomovilListItem({ automovilId: 1, usuarioId: 1, placas: 'ABC-1', marca: 'Toyota', modelo: 'Yaris' })
    expect(vehiculoTitulo(v)).toBe('ABC-1')
    expect(vehiculoSubtitulo(v)).toContain('Toyota')
  })
})
