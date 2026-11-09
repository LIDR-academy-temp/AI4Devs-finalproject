import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import type { UsuarioPadronItem } from '../../../shared/types/usuariosAdmin'

export function usePadronUsuarios(perfilFilter?: string, soloActivos = true) {
  const [data, setData] = useState<UsuarioPadronItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (perfilFilter) params.set('perfil', perfilFilter)
    if (soloActivos) params.set('bActivo', 'true')
    const qs = params.toString()
    const path = `/SGR/Usuarios${qs ? `?${qs}` : ''}`
    const { data: list, problem, status } = await apiGet<UsuarioPadronItem[]>(path)
    if (!list) {
      setError(problem?.detail ?? `Error ${status}`)
      setData([])
    } else {
      setData(list)
    }
    setLoading(false)
  }, [perfilFilter, soloActivos])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
