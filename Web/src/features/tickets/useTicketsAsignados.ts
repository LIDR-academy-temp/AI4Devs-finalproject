import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import { getAccessToken } from '../../shared/lib/accessTokenStore'
import type { PaginaMisTickets } from '../../shared/types/tickets'

export type TicketsAsignadosFiltro = {
  terminado?: boolean
  estadoTicketId?: number
  pagina?: number
  tamano?: number
}

export function useTicketsAsignados(filtro: TicketsAsignadosFiltro) {
  const [data, setData] = useState<PaginaMisTickets | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (filtro.terminado !== undefined) {
      params.set('terminado', filtro.terminado ? 'true' : 'false')
    }
    if (filtro.estadoTicketId) {
      params.set('estadoTicketId', String(filtro.estadoTicketId))
    }
    params.set('pagina', String(filtro.pagina ?? 1))
    params.set('tamano', String(filtro.tamano ?? 20))

    const { data: page, problem, status } = await apiGet<PaginaMisTickets>(
      `/TKT/Tickets/asignados?${params}`,
    )

    if (!page || status !== 200) {
      setError(problem?.detail ?? 'No se pudieron cargar los tickets asignados')
      setData(null)
    } else {
      setData(page)
    }
    setLoading(false)
  }, [filtro.estadoTicketId, filtro.pagina, filtro.tamano, filtro.terminado])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
