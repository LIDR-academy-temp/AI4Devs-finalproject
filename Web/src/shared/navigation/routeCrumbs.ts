import { APP_NAV } from './appNavigation'

export type RouteCrumb = { label: string; path: string }

export function resolvePathLabel(
  pathname: string,
  navItems: ReadonlyArray<{ path: string; label: string }>,
): string | null {
  const exact = navItems.find((i) => i.path === pathname)
  if (exact) return exact.label

  const prefix = navItems
    .filter((i) => i.path !== '/' && pathname.startsWith(`${i.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]
  return prefix?.label ?? null
}

export function buildRouteCrumbs(
  pathname: string,
  navItems: ReadonlyArray<{ path: string; label: string }> = APP_NAV,
): RouteCrumb[] | null {
  if (pathname === '/') return null

  const crumbs: RouteCrumb[] = [{ label: 'Inicio', path: '/' }]
  const segments = pathname.split('/').filter(Boolean)

  let cumulative = ''
  for (const seg of segments) {
    cumulative += `/${seg}`
    if (seg === '403') {
      crumbs.push({ label: 'Acceso denegado', path: cumulative })
      continue
    }
    if (/^[0-9a-f-]{8,}$|^\d+$/.test(seg)) {
      crumbs.push({ label: 'Detalle', path: cumulative })
    } else {
      const label = resolvePathLabel(cumulative, navItems)
      if (label) crumbs.push({ label, path: cumulative })
    }
  }

  if (crumbs.length <= 1) return null
  return crumbs
}

export function getModuleTitle(crumbs: RouteCrumb[] | null): string | null {
  if (!crumbs?.length) return null
  return crumbs[crumbs.length - 1]?.label ?? null
}
