import { describe, expect, it } from 'vitest'
import {
  filterNavGroupsForItems,
  filterNavItemsByManifest,
  type NavGroup,
  type NavItem,
} from './appNavigation'

const hiddenPaths = ['/admin/integraciones/bot']

describe('TC-NAV-ENT1-01 manifest visibility (FE-NAV-ENT1-001)', () => {
  it('excluye rutas con implemented:false en manifest aunque vengan del API', () => {
    const raw: NavItem[] = [
      {
        path: '/admin/casas',
        label: 'Casas',
        icon: {} as NavItem['icon'],
        group: 'gestion',
        order: 43,
        implemented: true,
      },
      ...hiddenPaths.map((path, i) => ({
        path,
        label: path,
        icon: {} as NavItem['icon'],
        group: 'gestion',
        order: 47 + i,
        implemented: true,
      })),
    ]
    const filtered = filterNavItemsByManifest(raw)
    for (const path of hiddenPaths) {
      expect(filtered.some((i) => i.path === path)).toBe(false)
    }
    expect(filtered.some((i) => i.path === '/admin/casas')).toBe(true)
  })

  it('elimina grupos vacios tras filtrar', () => {
    const groups: NavGroup[] = [
      { key: 'gestion', label: 'Gestión' },
      { key: 'orphan', label: 'Orphan' },
    ]
    const items: NavItem[] = [
      {
        path: '/admin/casas',
        label: 'Casas',
        icon: {} as NavItem['icon'],
        group: 'gestion',
        order: 1,
        implemented: true,
      },
    ]
    const out = filterNavGroupsForItems(groups, items)
    expect(out.map((g) => g.key)).toEqual(['gestion'])
  })
})
