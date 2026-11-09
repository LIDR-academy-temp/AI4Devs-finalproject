import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import type { TipoArchivoItem } from '../../../shared/types/archivos'

type TipoArchivoApiRow = TipoArchivoItem & {
  TipoArchivoId?: number
  TipoArchivo?: string
}

function normalizeTipo(row: TipoArchivoApiRow): TipoArchivoItem {
  return {
    tipoArchivoId: row.tipoArchivoId ?? row.TipoArchivoId ?? 0,
    tipoArchivo: row.tipoArchivo ?? row.TipoArchivo ?? '',
  }
}

export function useTiposArchivo() {
  const [tipos, setTipos] = useState<TipoArchivoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, problem, status } = await apiGet<TipoArchivoApiRow[]>('/ARC/TiposArchivo')
      if (data) {
        setTipos(data.map(normalizeTipo))
      } else {
        setTipos([])
        setError(problem?.detail ?? `Error ${status}`)
      }
    } catch {
      setTipos([])
      setError('No se pudieron cargar los tipos de documento')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  return { tipos, loading, error, refetch }
}
