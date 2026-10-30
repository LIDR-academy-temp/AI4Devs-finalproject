import { useCallback, useEffect, useState } from 'react'
import { normalizeEncuestaListItem } from '../admin/encuestas/encuestaMappers'
import { apiGet } from '../../shared/lib/apiClient'
import type { EncuestaListItem } from '../../shared/types/encuestas'

export function useEncuestasActivas() {
  const [encuestas, setEncuestas] = useState<EncuestaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await apiGet<EncuestaListItem[]>('/ENC/Encuestas/activas')
    if (!res.data) {
      setError(res.problem?.detail ?? `Error ${res.status}`)
      setEncuestas([])
    } else {
      setEncuestas(res.data.map((item) => normalizeEncuestaListItem(item)))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { encuestas, loading, error, refetch }
}
