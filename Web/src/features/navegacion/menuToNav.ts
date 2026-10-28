import type { LucideIcon } from 'lucide-react'
import type { NavGroup, NavItem } from '../../shared/navigation/appNavigation'
import { iconFromMenuKey } from './menuIcons'
import type { MenuNodoDto } from './types'

export type ApiNavItem = NavItem & { menuId?: number }

export function collectRutasFromTree(roots: MenuNodoDto[]): string[] {
  const paths: string[] = []
  const walk = (nodes: MenuNodoDto[]) => {
    for (const n of nodes) {
      if (n.ruta?.trim()) paths.push(normalizePath(n.ruta))
      if (n.hijos?.length) walk(n.hijos)
    }
  }
  walk(roots)
  return paths
}

export function menuTreeToNav(roots: MenuNodoDto[]): { groups: NavGroup[]; items: ApiNavItem[] } {
  const groups: NavGroup[] = [{ key: 'principal', label: '' }]
  const items: ApiNavItem[] = []
  let groupOrder = 0

  for (const root of roots) {
    const groupKey = `menu-${root.menuId}`
    const hasChildren = (root.hijos?.length ?? 0) > 0

    if (hasChildren) {
      groups.push({ key: groupKey, label: root.titulo })
      appendLeaves(root.hijos, groupKey, items)
      groupOrder += 1
      continue
    }

    if (root.ruta?.trim()) {
      items.push(leafToItem(root, 'principal', items.length))
    }
  }

  items.sort((a, b) => a.order - b.order)
  return { groups, items }
}

function appendLeaves(nodes: MenuNodoDto[], groupKey: string, items: ApiNavItem[]) {
  for (const node of nodes) {
    if (node.hijos?.length) {
      appendLeaves(node.hijos, groupKey, items)
    } else if (node.ruta?.trim()) {
      items.push(leafToItem(node, groupKey, items.length))
    }
  }
}

function leafToItem(node: MenuNodoDto, group: string, index: number): ApiNavItem {
  const path = normalizePath(node.ruta!)
  const icon: LucideIcon = iconFromMenuKey(node.icono)
  return {
    path,
    label: node.titulo,
    icon,
    group,
    order: node.orden ?? index,
    implemented: true,
    menuId: node.menuId,
  }
}

export function normalizePath(ruta: string): string {
  const trimmed = ruta.trim()
  if (!trimmed) return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/** Rutas de cuenta propia: siempre permitidas con sesión (no dependen del árbol SGR). */
export const MENU_GUARD_SELF_SERVICE_PATHS = [
  '/perfil',
  '/cambiar-password',
  '/mis-vehiculos',
  '/mis-mascotas',
] as const

export function isSelfServicePath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return (MENU_GUARD_SELF_SERVICE_PATHS as readonly string[]).includes(path)
}

export function isPathAllowedByMenu(pathname: string, allowedPaths: string[]): boolean {
  const path = normalizePath(pathname)
  if (path === '/' || path === '/403') return true
  if (isSelfServicePath(path)) return true
  return allowedPaths.some((allowed) => {
    if (path === allowed) return true
    if (allowed !== '/' && path.startsWith(`${allowed}/`)) return true
    return false
  })
}
