import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import { getAccessToken } from '../../../shared/lib/accessTokenStore'
import type { PaginaReservacionesAdmin } from '../../../shared/types/visitas'

export type ReservacionesAdminFiltro = {
  areaComunId?: number
  desde?: string
  hasta?: string
  pagina?: number
  tamano?: number
}

export function useReservacionesAdmin(filtro: ReservacionesAdminFiltro, enabled = true) {
  const [data, setData] = useState<PaginaReservacionesAdmin | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!enabled || !getAccessToken()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (filtro.areaComunId) {
      params.set('areaComunId', String(filtro.areaComunId))
    }
    if (filtro.desde) {
      params.set('desde', filtro.desde)
    }
    if (filtro.hasta) {
      params.set('hasta', filtro.hasta)
    }
    params.set('pagina', String(filtro.pagina ?? 1))
    params.set('tamano', String(filtro.tamano ?? 20))

    const { data: page, problem, status } = await apiGet<PaginaReservacionesAdmin>(
      `/VTS/ReservacionesArea/admin?${params}`,
    )

    if (!page || status !== 200) {
      setError(problem?.detail ?? 'No se pudieron cargar las reservaciones del condominio')
      setData(null)
    } else {
      setData(page)
    }
    setLoading(false)
  }, [enabled, filtro.areaComunId, filtro.desde, filtro.hasta, filtro.pagina, filtro.tamano])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
