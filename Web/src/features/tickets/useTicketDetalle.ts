import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import { getAccessToken } from '../../shared/lib/accessTokenStore'
import type { TicketDetalle } from '../../shared/types/tickets'

export function useTicketDetalle(ticketId: number) {
  const [detalle, setDetalle] = useState<TicketDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const refetch = useCallback(async () => {
    if (!Number.isFinite(ticketId) || ticketId <= 0 || !getAccessToken()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setNotFound(false)

    const { data, problem, status } = await apiGet<TicketDetalle>(`/TKT/Tickets/${ticketId}`)

    if (status === 404) {
      setDetalle(null)
      setNotFound(true)
    } else if (!data || status !== 200) {
      setError(problem?.detail ?? 'No se pudo cargar el ticket')
      setDetalle(null)
    } else {
      setDetalle(data)
    }
    setLoading(false)
  }, [ticketId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { detalle, loading, error, notFound, refetch }
}
