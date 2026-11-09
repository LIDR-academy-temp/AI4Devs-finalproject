import { useCallback, useEffect, useState } from 'react'
import { fetchPerfilesAdmin } from './navegacion.api'
import type { PerfilListItem } from './types'

export function usePerfilesAdmin() {
  const [perfiles, setPerfiles] = useState<PerfilListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchPerfilesAdmin()
    if (!res.data) {
      setPerfiles([])
      setError(res.problem?.detail ?? `Error ${res.status}`)
    } else {
      setPerfiles(res.data.filter((p) => p.nombre))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { perfiles, loading, error, refetch }
}
