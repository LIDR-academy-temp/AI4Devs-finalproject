import { useState } from 'react'
import { TicketsList } from '../features/tickets/TicketsList'
import { useCatalogosTicket } from '../features/tickets/useCatalogosTicket'
import { useTicketsAsignados } from '../features/tickets/useTicketsAsignados'
import { EmptyState, PageHeader, PortalPageLayout } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

export function TrabajadorTicketsPage() {
  const [estadoId, setEstadoId] = useState<number | undefined>()
  const { estados } = useCatalogosTicket()
  const { data, loading, error, refetch } = useTicketsAsignados({
    terminado: false,
    estadoTicketId: estadoId,
  })
  useQueryErrorToast(error)

  return (
    <PortalPageLayout width="3xl" className="space-y-4">
      <PageHeader
        title="Tickets asignados"
        description="Incidencias que te asignó el administrador del condominio."
      />

      <label className="flex items-center gap-2 text-sm">
        Estado
        <select
          className="rounded border border-slate-300 px-2 py-1"
          value={estadoId ?? ''}
          onChange={(e) => setEstadoId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Todos</option>
          {estados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>

      {loading && <p className="text-neutral">Cargando…</p>}
      {error && (
        <button
          type="button"
          className="cursor-pointer text-sm text-primary underline"
          onClick={() => void refetch()}
        >
          Reintentar
        </button>
      )}
      {!loading && !error && data?.items.length === 0 && (
        <EmptyState title="No tienes tickets pendientes asignados." />
      )}
      {data?.items.length ? (
        <TicketsList items={data.items} ticketPathPrefix="/trabajador/tickets" />
      ) : null}
    </PortalPageLayout>
  )
}
