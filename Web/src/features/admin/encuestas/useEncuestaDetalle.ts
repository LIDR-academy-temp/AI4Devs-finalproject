import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import type { EncuestaDetalle } from '../../../shared/types/encuestas'
import { normalizeEncuestaDetalle } from './encuestaMappers'

function parseEncuestaId(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function useEncuestaDetalle(encuestaIdParam: string | undefined) {
  const encuestaId = parseEncuestaId(encuestaIdParam)
  const [detalle, setDetalle] = useState<EncuestaDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!encuestaId) {
      setDetalle(null)
      setError('Identificador de encuesta no válido.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<EncuestaDetalle>(`/ENC/Encuestas/${encuestaId}`)
      if (!res.data) {
        setError(res.problem?.detail ?? `Error ${res.status}`)
        setDetalle(null)
      } else {
        setDetalle(normalizeEncuestaDetalle(res.data))
      }
    } catch {
      setError('No se pudo conectar con la API. ¿Está GraphApi en ejecución?')
      setDetalle(null)
    } finally {
      setLoading(false)
    }
  }, [encuestaId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { encuestaId, detalle, loading, error, refetch }
}
