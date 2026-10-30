import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  filterNavGroupsForItems,
  filterNavItemsByManifest,
  navGroupsForPerfil,
  navItemsForPerfil,
  type NavGroup,
  type NavItem,
} from '../../shared/navigation/appNavigation'
import { menuTreeToNav, supplementApiNavWithManifest } from './menuToNav'
import { fetchMenusNavegacion } from './navegacion.api'
import type { MenuNodoDto } from './types'

export type NavegacionSource = 'api' | 'static'

export type NavegacionState = {
  loading: boolean
  source: NavegacionSource
  groups: NavGroup[]
  items: NavItem[]
  allowedPaths: string[]
  tree: MenuNodoDto[]
  error: string | null
  refetch: () => Promise<void>
}

const staticFallbackFlag = import.meta.env.VITE_NAV_STATIC_FALLBACK === 'true'

export function useNavegacionMenus(): NavegacionState {
  const { session } = useAuth()
  const perfil = session?.perfil ?? ''
  const [loading, setLoading] = useState(true)
  const [tree, setTree] = useState<MenuNodoDto[]>([])
  const [source, setSource] = useState<NavegacionSource>('static')
  const [error, setError] = useState<string | null>(null)

  const staticGroups = useMemo(() => navGroupsForPerfil(perfil), [perfil])
  const staticItems = useMemo(() => navItemsForPerfil(perfil), [perfil])

  const refetch = useCallback(async () => {
    if (!session?.token) {
      setTree([])
      setSource('static')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const res = await fetchMenusNavegacion()
    if (res.data && res.data.length > 0) {
      setTree(res.data)
      setSource('api')
      setLoading(false)
      return
    }
    if (res.data && res.data.length === 0) {
      setTree([])
      setSource('static')
      setLoading(false)
      return
    }
    setTree([])
    if (staticFallbackFlag) {
      setSource('static')
    } else {
      setSource('static')
      setError(res.problem?.detail ?? `Error ${res.status}`)
    }
    setLoading(false)
  }, [session?.token])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const apiNav = useMemo(() => (tree.length ? menuTreeToNav(tree) : null), [tree])

  const supplementedApiNav = useMemo(() => {
    if (source !== 'api' || !apiNav) return null
    return supplementApiNavWithManifest(apiNav, staticItems, staticGroups)
  }, [source, apiNav, staticItems, staticGroups])

  const rawGroups = useMemo(
    () => (source === 'api' && supplementedApiNav ? supplementedApiNav.groups : staticGroups),
    [source, supplementedApiNav, staticGroups],
  )
  const rawItems = useMemo(
    () => (source === 'api' && supplementedApiNav ? supplementedApiNav.items : staticItems),
    [source, supplementedApiNav, staticItems],
  )
  const items = useMemo(
    () => filterNavItemsByManifest(rawItems),
    [rawItems],
  )
  const groups = useMemo(
    () => filterNavGroupsForItems(rawGroups, items),
    [rawGroups, items],
  )
  const allowedPaths = useMemo(
    () => items.filter((i) => i.implemented).map((i) => i.path),
    [items],
  )

  return {
    loading,
    source,
    groups,
    items,
    allowedPaths,
    tree,
    error,
    refetch,
  }
}
