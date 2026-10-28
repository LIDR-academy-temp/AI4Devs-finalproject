import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TicketsList } from '../features/tickets/TicketsList'
import { useCatalogosTicket } from '../features/tickets/useCatalogosTicket'
import { useMisTickets } from '../features/tickets/useMisTickets'
import { AlertBanner, EmptyState, PageHeader } from '../shared/components/admin'

export function TicketsPage() {
  const [estadoId, setEstadoId] = useState<number | undefined>()
  const { estados } = useCatalogosTicket()
  const { data, loading, error, refetch } = useMisTickets({ estadoTicketId: estadoId })

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <PageHeader
        title="Mis tickets"
        description="Incidencias que has reportado al condominio."
        actions={
          <Link
            to="/tickets/nuevo"
            className="cursor-pointer rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Nuevo ticket
          </Link>
        }
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
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
      </label>

      {loading && <p className="text-neutral">Cargando…</p>}
      {error && (
        <AlertBanner variant="error">
          <span>{error}</span>
          <button type="button" className="ml-2 text-sm underline" onClick={() => void refetch()}>
            Reintentar
          </button>
        </AlertBanner>
      )}
      {!loading && !error && data?.items.length === 0 && (
        <EmptyState title="No has reportado incidencias aún." />
      )}
      {data?.items.length ? <TicketsList items={data.items} /> : null}
    </main>
  )
}
