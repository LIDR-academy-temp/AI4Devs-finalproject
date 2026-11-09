import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { ArchivoListItem } from '../../shared/types/archivos'
import { normalizeArchivoListItem, type ArchivoListItemApiRow } from './archivoMappers'

export function useArchivos(tipoArchivo?: string) {
  const [archivos, setArchivos] = useState<ArchivoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = tipoArchivo
        ? `/ARC/Archivos?tipoArchivo=${encodeURIComponent(tipoArchivo)}`
        : '/ARC/Archivos'
      const { data, problem, status } = await apiGet<ArchivoListItemApiRow[]>(url)
      if (!data) {
        setError(problem?.detail ?? `Error ${status}`)
        setArchivos([])
      } else {
        setArchivos(data.map(normalizeArchivoListItem))
      }
    } catch {
      setError('Error al cargar los archivos.')
    } finally {
      setLoading(false)
    }
  }, [tipoArchivo])

  useEffect(() => { void refetch() }, [refetch])

  return { archivos, loading, error, refetch }
}
