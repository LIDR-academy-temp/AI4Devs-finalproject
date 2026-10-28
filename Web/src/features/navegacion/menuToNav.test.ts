import { describe, expect, it } from 'vitest'
import { collectRutasFromTree, isPathAllowedByMenu, menuTreeToNav } from './menuToNav'
import type { MenuNodoDto } from './types'

const sampleTree: MenuNodoDto[] = [
  {
    menuId: 1,
    titulo: 'Gestión',
    ruta: null,
    icono: null,
    orden: 1,
    hijos: [
      {
        menuId: 2,
        titulo: 'Casas',
        ruta: '/admin/casas',
        icono: 'building',
        orden: 1,
        hijos: [],
      },
    ],
  },
]

describe('menuToNav', () => {
  it('convierte árbol a grupos e ítems', () => {
    const { groups, items } = menuTreeToNav(sampleTree)
    expect(groups.some((g) => g.label === 'Gestión')).toBe(true)
    expect(items.some((i) => i.path === '/admin/casas')).toBe(true)
  })

  it('recolecta rutas para guard', () => {
    const paths = collectRutasFromTree(sampleTree)
    expect(paths).toContain('/admin/casas')
  })

  it('permite rutas hijas por prefijo', () => {
    expect(isPathAllowedByMenu('/admin/casas', ['/admin/casas'])).toBe(true)
    expect(isPathAllowedByMenu('/admin/casas/extra', ['/admin/casas'])).toBe(true)
    expect(isPathAllowedByMenu('/admin/menus', ['/admin/casas'])).toBe(false)
  })

  it('permite /perfil aunque no este en el menu JWT (cuenta propia)', () => {
    expect(isPathAllowedByMenu('/perfil', ['/admin/casas'])).toBe(true)
  })
})
