import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { VisitaListItem } from '../../shared/types/visitas'
import { normalizeVisita } from './visitasMappers'

interface UseVisitasParams {
  casaId?: number
  desde?: string
  hasta?: string
}

export function useVisitas(params: UseVisitasParams = {}) {
  const [visitas, setVisitas] = useState<VisitaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVisitas = useCallback(async () => {
    setLoading(true)
    setError(null)
    const searchParams = new URLSearchParams()
    if (params.casaId) searchParams.set('casaId', String(params.casaId))
    if (params.desde) searchParams.set('desde', params.desde)
    if (params.hasta) searchParams.set('hasta', params.hasta)
    const qs = searchParams.toString()
    const url = `/VTS/Visitas${qs ? `?${qs}` : ''}`
    const { data, problem, status } = await apiGet<VisitaListItem[]>(url)
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setVisitas([])
    } else {
      setVisitas(data.map((row) => normalizeVisita(row)))
    }
    setLoading(false)
  }, [params.casaId, params.desde, params.hasta])

  useEffect(() => {
    void fetchVisitas()
  }, [fetchVisitas])

  return { visitas, loading, error, refetch: fetchVisitas }
}
