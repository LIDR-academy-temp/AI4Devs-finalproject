import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { JuntaListItem } from '../../shared/types/juntas'
import { normalizeJuntaListItem, type JuntaListApiRow } from './juntaMappers'

export function useJuntas() {
  const [juntas, setJuntas] = useState<JuntaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJuntas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, problem, status } = await apiGet<JuntaListApiRow[]>('/JNT/Juntas')
      if (!data) {
        setError(problem?.detail ?? `Error ${status}`)
        setJuntas([])
      } else {
        setJuntas(data.map(normalizeJuntaListItem))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar juntas')
      setJuntas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchJuntas() }, [fetchJuntas])

  return { juntas, loading, error, refetch: fetchJuntas }
}
