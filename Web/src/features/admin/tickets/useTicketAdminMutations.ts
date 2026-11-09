import { useCallback, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { apiDelete, apiPatch, apiPost } from '../../../shared/lib/apiClient'
import { prioridadToApi, residenteIdFromForm } from './ticketAdminSchemas'
import type { TicketAdminCreateForm, TicketAdminEditForm } from './ticketAdminSchemas'

export function useTicketAdminMutations() {
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)

  const crear = useCallback(
    async (values: TicketAdminCreateForm) => {
      if (!session?.token) return { ok: false as const, detail: 'Sin sesión' }
      setBusy(true)
      const { status, problem } = await apiPost(
        '/TKT/Tickets/admin',
        {
          usuarioSolicitanteId: residenteIdFromForm(values.usuarioSolicitanteId),
          titulo: values.titulo,
          descripcion: values.descripcion,
          categoria: values.categoria,
          prioridad: prioridadToApi(values.prioridad),
        },
        session.token,
      )
      setBusy(false)
      if (status === 201) return { ok: true as const }
      return { ok: false as const, detail: problem?.detail ?? 'No se pudo crear el ticket' }
    },
    [session?.token],
  )

  const actualizar = useCallback(
    async (ticketId: number, values: TicketAdminEditForm) => {
      if (!session?.token) return { ok: false as const, detail: 'Sin sesión' }
      setBusy(true)
      const { status, problem } = await apiPatch(
        `/TKT/Tickets/${ticketId}/admin`,
        {
          titulo: values.titulo,
          descripcion: values.descripcion,
          categoria: values.categoria,
          prioridad: prioridadToApi(values.prioridad),
        },
        session.token,
      )
      setBusy(false)
      if (status === 204) return { ok: true as const }
      return { ok: false as const, detail: problem?.detail ?? 'No se pudo actualizar el ticket' }
    },
    [session?.token],
  )

  const eliminar = useCallback(
    async (ticketId: number) => {
      if (!session?.token) return { ok: false as const, detail: 'Sin sesión' }
      setBusy(true)
      const { status, problem } = await apiDelete(`/TKT/Tickets/${ticketId}/admin`, session.token)
      setBusy(false)
      if (status === 204) return { ok: true as const }
      return { ok: false as const, detail: problem?.detail ?? 'No se pudo eliminar el ticket' }
    },
    [session?.token],
  )

  return { crear, actualizar, eliminar, busy }
}
