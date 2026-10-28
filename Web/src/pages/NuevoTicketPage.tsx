import { Link } from 'react-router-dom'
import { TicketForm } from '../features/tickets/TicketForm'
import { useCatalogosTicket } from '../features/tickets/useCatalogosTicket'
import { PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

export function NuevoTicketPage() {
  const { categorias, prioridades, loading, error } = useCatalogosTicket()
  useQueryErrorToast(error)

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link to="/tickets" className="text-sm text-primary-600 hover:underline">← Mis tickets</Link>
      <PageHeader title="Nuevo ticket" description="Describe la incidencia con el mayor detalle posible." />
      {loading && <p className="text-neutral">Cargando catálogos…</p>}
      {error && (
        <p className="text-sm text-neutral" role="status">
          No se puede crear el ticket hasta que carguen los catálogos.
        </p>
      )}
      {!loading && !error && <TicketForm categorias={categorias} prioridades={prioridades} />}
    </main>
  )
}
