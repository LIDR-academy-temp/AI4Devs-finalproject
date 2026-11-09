import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { JuntaDetalle } from '../../shared/types/juntas'
import { normalizeJuntaDetalle, type JuntaDetalleApiRow } from './juntaMappers'

export function useJuntaDetalle(id: number) {
  const [junta, setJunta] = useState<JuntaDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJunta = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, problem, status } = await apiGet<JuntaDetalleApiRow>(`/JNT/Juntas/${id}`)
      if (!data) {
        setError(problem?.detail ?? `Error ${status}`)
        setJunta(null)
      } else {
        setJunta(normalizeJuntaDetalle(data))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar junta')
      setJunta(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void fetchJunta() }, [fetchJunta])

  return { junta, loading, error, refetch: fetchJunta }
}
