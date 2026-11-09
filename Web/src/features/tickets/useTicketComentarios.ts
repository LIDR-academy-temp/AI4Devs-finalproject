import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../shared/lib/apiClient'
import { getAccessToken } from '../../shared/lib/accessTokenStore'
import type { ComentarioTicket, CrearComentarioInput } from '../../shared/types/tickets'

export function useTicketComentarios(ticketId: number) {
  const [items, setItems] = useState<ComentarioTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  const refetch = useCallback(async () => {
    if (!Number.isFinite(ticketId) || ticketId <= 0 || !getAccessToken()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, problem, status } = await apiGet<ComentarioTicket[]>(
      `/TKT/Tickets/${ticketId}/comentarios`,
    )

    if (!data || status !== 200) {
      setError(problem?.detail ?? 'No se pudieron cargar los comentarios')
      setItems([])
    } else {
      setItems(data)
    }
    setLoading(false)
  }, [ticketId])

  const publicar = useCallback(
    async (input: CrearComentarioInput, token?: string | null) => {
      setPosting(true)
      const { status, problem } = await apiPost(
        `/TKT/Tickets/${ticketId}/comentarios`,
        input,
        token,
      )
      setPosting(false)
      if (status === 201) {
        await refetch()
        return { ok: true as const }
      }
      return { ok: false as const, error: problem?.detail ?? 'No se pudo publicar' }
    },
    [ticketId, refetch],
  )

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { items, loading, error, posting, refetch, publicar }
}
