import { describe, expect, it } from 'vitest'
import {
  collectDescendantIds,
  menuParentSelectOptions,
  suggestMenuOrder,
} from './menuAdminFormUtils'
import type { MenuAdminItem } from './types'

const sample: MenuAdminItem[] = [
  { menuId: 1, titulo: 'Raíz', ruta: null, icono: 'home', orden: 0, padreMenuId: null, eliminado: false },
  { menuId: 2, titulo: 'Hijo', ruta: '/a', icono: 'user', orden: 0, padreMenuId: 1, eliminado: false },
  { menuId: 3, titulo: 'Nieto', ruta: '/b', icono: 'user', orden: 1, padreMenuId: 2, eliminado: false },
]

describe('menuAdminFormUtils', () => {
  it('excluye descendientes al editar padre', () => {
    const opts = menuParentSelectOptions(sample, 2)
    const values = opts.map((o) => o.value)
    expect(values).toContain('')
    expect(values).toContain('1')
    expect(values).not.toContain('2')
    expect(values).not.toContain('3')
  })

  it('collectDescendantIds incluye raíz del subárbol', () => {
    const ids = collectDescendantIds(sample, 2)
    expect(ids.has(2)).toBe(true)
    expect(ids.has(3)).toBe(true)
    expect(ids.has(1)).toBe(false)
  })

  it('suggestMenuOrder usa max+1 entre hermanos', () => {
    expect(suggestMenuOrder(sample, 2)).toBe(2)
    expect(suggestMenuOrder(sample, null)).toBe(1)
  })
})
