import { Link } from 'react-router-dom'
import { TicketForm } from '../features/tickets/TicketForm'
import { useCatalogosTicket } from '../features/tickets/useCatalogosTicket'
import { AlertBanner, PageHeader } from '../shared/components/admin'

export function NuevoTicketPage() {
  const { categorias, loading, error } = useCatalogosTicket()

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link to="/tickets" className="text-sm text-primary-600 hover:underline">← Mis tickets</Link>
      <PageHeader title="Nuevo ticket" description="Describe la incidencia con el mayor detalle posible." />
      {loading && <p className="text-neutral">Cargando catálogos…</p>}
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {!loading && !error && <TicketForm categorias={categorias} />}
    </main>
  )
}
