import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { APP_NAV } from '../navigation/appNavigation'

function getLabelForSegment(pathname: string): string | null {
  const match = APP_NAV.find(
    (item) =>
      item.path === pathname ||
      (item.path !== '/' && pathname.startsWith(item.path + '/')),
  )
  return match?.label ?? null
}

export function Breadcrumbs() {
  const location = useLocation()
  const { pathname } = location

  if (pathname === '/') return null

  // Construir segmentos
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; path: string }[] = [{ label: 'Inicio', path: '/' }]

  let cumulative = ''
  for (const seg of segments) {
    cumulative += `/${seg}`
    // Ignorar segmentos UUID/numéricos (páginas de detalle)
    if (/^[0-9a-f-]{8,}$|^\d+$/.test(seg)) {
      crumbs.push({ label: 'Detalle', path: cumulative })
    } else {
      const label = getLabelForSegment(cumulative)
      if (label) crumbs.push({ label, path: cumulative })
    }
  }

  if (crumbs.length <= 1) return null

  return (
    <nav
      aria-label="Ruta de navegación"
      className="flex min-w-0 items-center gap-1 truncate text-sm text-white/55"
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={crumb.path} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden="true" />}
            {isLast ? (
              <span className="truncate font-medium text-white">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                className="truncate no-underline transition-colors hover:text-white"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
