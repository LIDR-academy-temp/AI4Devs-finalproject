import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useNavegacion } from '../../features/navegacion/NavegacionContext'
import { APP_NAV } from './appNavigation'
import { buildRouteCrumbs, getModuleTitle } from './routeCrumbs'

export function useRouteCrumbs() {
  const { pathname } = useLocation()
  const { items } = useNavegacion()

  const navForLabels = useMemo(() => {
    if (items.length > 0) return items.map((i) => ({ path: i.path, label: i.label }))
    return APP_NAV.map((i) => ({ path: i.path, label: i.label }))
  }, [items])

  const crumbs = useMemo(
    () => buildRouteCrumbs(pathname, navForLabels),
    [pathname, navForLabels],
  )

  const moduleTitle = useMemo(() => getModuleTitle(crumbs), [crumbs])

  return { crumbs, moduleTitle, pathname }
}
