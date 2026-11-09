import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TicketsList } from '../features/tickets/TicketsList'
import { useCatalogosTicket } from '../features/tickets/useCatalogosTicket'
import { useMisTickets } from '../features/tickets/useMisTickets'
import { PortalListPage, PortalListSection, PortalToolbar } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

export function TicketsPage() {
  const [estadoId, setEstadoId] = useState<number | undefined>()
  const { estados } = useCatalogosTicket()
  const { data, loading, error, refetch } = useMisTickets({ estadoTicketId: estadoId })
  useQueryErrorToast(error)

  const itemCount = data?.items.length ?? 0
  const filtroLabel = estadoId ? estados.find((e) => e.id === estadoId)?.nombre : 'Todos'

  return (
    <PortalListPage
      width="3xl"
      header={{
        title: 'Mis tickets',
        description:
          itemCount > 0
            ? `${itemCount} incidencia${itemCount === 1 ? '' : 's'} · filtro: ${filtroLabel}`
            : 'Reporta fallas o solicitudes al condominio.',
        actions: (
          <Link to="/tickets/nuevo" className="cq-portal-btn-primary">
            + Nuevo ticket
          </Link>
        ),
      }}
      toolbar={
        <PortalToolbar>
          <label className="flex items-center gap-2" htmlFor="filtro-estado-ticket">
            Estado
            <select
              id="filtro-estado-ticket"
              className="rounded-lg border border-neutral-200 bg-surface-alt px-3 py-2 text-sm"
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
        </PortalToolbar>
      }
      loading={loading}
      error={error}
      onRetry={() => void refetch()}
      empty={
        !loading && !error && itemCount === 0
          ? {
              title: 'No has reportado incidencias aún.',
              description: 'Usa «Nuevo ticket» para contactar a administración.',
            }
          : undefined
      }
    >
      {itemCount > 0 ? (
        <PortalListSection title="Listado">
          <TicketsList items={data!.items} embedded />
        </PortalListSection>
      ) : null}
    </PortalListPage>
  )
}
