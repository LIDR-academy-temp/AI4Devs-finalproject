import { useCallback, useEffect, useState } from 'react'
import { fetchMenusAdmin } from './navegacion.api'
import type { MenuAdminItem } from './types'

export function useMenusAdmin() {
  const [menus, setMenus] = useState<MenuAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchMenusAdmin(true)
    if (!res.data) {
      setMenus([])
      setError(res.problem?.detail ?? `Error ${res.status}`)
    } else {
      setMenus(res.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { menus, loading, error, refetch }
}
