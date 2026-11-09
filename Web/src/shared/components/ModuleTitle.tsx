import { useRouteCrumbs } from '../navigation/useRouteCrumbs'

/** Título del módulo actual (último crumb). Visible en header desktop cuando difiere del trail compacto. */
export function ModuleTitle() {
  const { moduleTitle, pathname } = useRouteCrumbs()
  if (!moduleTitle || pathname === '/') return null

  return (
    <span className="hidden shrink-0 text-sm font-semibold text-white lg:inline" aria-current="page">
      {moduleTitle}
    </span>
  )
}
