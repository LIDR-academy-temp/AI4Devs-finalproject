import type { MenuAdminItem } from './types'

export function collectDescendantIds(menus: MenuAdminItem[], rootId: number): Set<number> {
  const ids = new Set<number>([rootId])
  const walk = (parentId: number) => {
    for (const m of menus) {
      if (m.padreMenuId === parentId && !m.eliminado && !ids.has(m.menuId)) {
        ids.add(m.menuId)
        walk(m.menuId)
      }
    }
  }
  walk(rootId)
  return ids
}

export type MenuParentOption = { value: string; label: string }

/** Opciones para `<select>` de menú padre (excluye el ítem editado y sus hijos). */
export function menuParentSelectOptions(
  menus: MenuAdminItem[],
  excludeMenuId?: number,
): MenuParentOption[] {
  const active = menus.filter((m) => !m.eliminado)
  const invalid = excludeMenuId != null ? collectDescendantIds(menus, excludeMenuId) : new Set<number>()

  const options: MenuParentOption[] = [{ value: '', label: '— Raíz (menú principal) —' }]

  const walk = (parentId: number | null, depth: number) => {
    active
      .filter((m) => m.padreMenuId === parentId && !invalid.has(m.menuId))
      .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo))
      .forEach((m) => {
        const prefix = depth > 0 ? `${'· '.repeat(depth)}` : ''
        options.push({ value: String(m.menuId), label: `${prefix}${m.titulo}` })
        walk(m.menuId, depth + 1)
      })
  }

  walk(null, 0)
  return options
}

export function suggestMenuOrder(menus: MenuAdminItem[], padreMenuId: number | null): number {
  const siblings = menus.filter((m) => !m.eliminado && m.padreMenuId === padreMenuId)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((m) => m.orden)) + 1
}

export function filterMenusForTree(menus: MenuAdminItem[], query: string): MenuAdminItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return menus

  const active = menus.filter((m) => !m.eliminado)
  const matched = new Set<number>()

  for (const m of active) {
    const hay =
      m.titulo.toLowerCase().includes(q) ||
      (m.ruta?.toLowerCase().includes(q) ?? false) ||
      String(m.menuId).includes(q)
    if (hay) matched.add(m.menuId)
  }

  const includeAncestors = (id: number) => {
    const node = active.find((m) => m.menuId === id)
    if (!node?.padreMenuId) return
    if (!matched.has(node.padreMenuId)) {
      matched.add(node.padreMenuId)
      includeAncestors(node.padreMenuId)
    }
  }

  matched.forEach((id) => includeAncestors(id))

  return menus.filter((m) => matched.has(m.menuId) || m.eliminado)
}
