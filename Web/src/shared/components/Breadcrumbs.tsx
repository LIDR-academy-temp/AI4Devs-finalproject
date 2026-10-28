import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useRouteCrumbs } from '../navigation/useRouteCrumbs'

export function Breadcrumbs() {
  const { crumbs } = useRouteCrumbs()
  if (!crumbs) return null

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
              <span className="truncate font-medium text-white md:font-normal md:text-white/80">
                {crumb.label}
              </span>
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
