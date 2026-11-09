import { describe, expect, it } from 'vitest'
import { normalizeArchivoListItem, type ArchivoListItemApiRow } from './archivoMappers'

describe('normalizeArchivoListItem', () => {
  it('mapea PascalCase del API legacy', () => {
    const row = normalizeArchivoListItem({
      ArchivoId: 7,
      Nombre: 'Reglamento.pdf',
      Ruta: '/x',
      TipoArchivo: 'Reglamento',
      EsPrivado: false,
      FechaCreacion: '2026-01-15T12:00:00Z',
    } as ArchivoListItemApiRow)
    expect(row.archivoId).toBe(7)
    expect(row.nombre).toBe('Reglamento.pdf')
    expect(row.tipoArchivo).toBe('Reglamento')
    expect(row.esPrivado).toBe(false)
    expect(row.fechaCreacion).toContain('2026')
  })
})
