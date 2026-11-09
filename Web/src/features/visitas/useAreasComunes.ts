import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { AreaComun } from '../../shared/types/visitas'

export function useAreasComunes() {
  const [areas, setAreas] = useState<AreaComun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAreas = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<AreaComun[]>('/VTS/AreasComunes')
    if (!data || status !== 200) {
      setError(problem?.detail ?? 'Error al cargar áreas comunes')
      setAreas([])
    } else {
      setAreas(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchAreas()
  }, [fetchAreas])

  return { areas, loading, error, refetch: fetchAreas }
}
