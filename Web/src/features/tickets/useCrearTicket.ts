import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../../shared/lib/apiClient'
import type { CrearTicketInput, UserError } from '../../shared/types/tickets'

export function useCrearTicket() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const crear = async (
    input: CrearTicketInput,
  ): Promise<{ ok: boolean; errors?: UserError[] }> => {
    setLoading(true)
    try {
      const { status, problem } = await apiPost<unknown>('/TKT/Tickets', input)

      if (status === 201) {
        navigate('/tickets', { replace: true })
        return { ok: true }
      }

      return {
        ok: false,
        errors: [
          {
            code: problem?.code ?? 'CREATE_FAILED',
            message: problem?.detail ?? 'No se pudo crear el ticket',
          },
        ],
      }
    } finally {
      setLoading(false)
    }
  }

  return { crear, loading }
}
