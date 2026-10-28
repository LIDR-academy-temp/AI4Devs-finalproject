import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { apiGet } from '../../../shared/lib/apiClient'

export type AdminTicketItem = {
  ticketId: number
  titulo: string
  estado: string
  prioridad: string
  categoria: string | null
  solicitante: string
  fechaCreacion: string
}

type Page = { total: number; pagina: number; items: AdminTicketItem[] }

export function useTicketsAdmin(estadoTicketId?: number) {
  const { session } = useAuth()
  const [data, setData] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    const params = new URLSearchParams({ pagina: '1', tamano: '50' })
    if (estadoTicketId) params.set('estadoTicketId', String(estadoTicketId))
    const { data: page, problem, status } = await apiGet<Page>(
      `/TKT/Tickets/admin?${params}`,
      session.token,
    )
    if (!page || status !== 200) {
      setError(problem?.detail ?? 'Error al cargar tickets')
      setData(null)
    } else {
      setData(page)
      setError(null)
    }
    setLoading(false)
  }, [session?.token, estadoTicketId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
