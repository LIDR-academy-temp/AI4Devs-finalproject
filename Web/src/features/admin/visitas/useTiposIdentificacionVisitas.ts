import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import type { TipoIdentificacionDto } from '../../../shared/types/visitas'
import { normalizeTipoIdentificacion } from '../../visitas/visitasMappers'

export function useTiposIdentificacionVisitas() {
  const [tipos, setTipos] = useState<TipoIdentificacionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<TipoIdentificacionDto[]>('/VTS/TiposIdentificacion')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setTipos([])
    } else {
      setTipos(data.map((row) => normalizeTipoIdentificacion(row)))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { tipos, loading, error, recargar }
}
