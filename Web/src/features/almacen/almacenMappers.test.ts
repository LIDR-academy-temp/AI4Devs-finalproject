import { describe, expect, it } from 'vitest'
import { normalizeArticulo, normalizeCategoria } from './almacenMappers'

describe('almacenMappers', () => {
  it('normaliza categoría PascalCase del API', () => {
    expect(normalizeCategoria({ CategoriaId: 3, Nombre: 'Equipo' })).toEqual({
      categoriaId: 3,
      nombre: 'Equipo',
    })
  })

  it('normaliza artículo PascalCase del API', () => {
    expect(
      normalizeArticulo({
        ArticuloId: 1,
        Nombre: 'Martillo',
        CategoriaId: 2,
        Categoria: 'Herramienta',
        Stock: 4,
        StockMinimo: 1,
        BajoMinimo: false,
      }),
    ).toEqual({
      articuloId: 1,
      nombre: 'Martillo',
      categoriaId: 2,
      categoria: 'Herramienta',
      stock: 4,
      stockMinimo: 1,
      bajoMinimo: false,
      ubicacion: undefined,
    })
  })
})
