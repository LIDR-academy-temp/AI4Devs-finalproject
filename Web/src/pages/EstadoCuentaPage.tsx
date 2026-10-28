import { Link } from 'react-router-dom'
import { CuotasTable } from '../features/finanzas/CuotasTable'
import { formatMxn } from '../features/finanzas/format'
import { useEstadoCuenta } from '../features/finanzas/useEstadoCuenta'
import { AlertBanner, EmptyState, PageHeader } from '../shared/components/admin'

export function EstadoCuentaPage() {
  const { data, loading, error, refetch } = useEstadoCuenta()

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 md:px-8">
      <Link to="/" className="text-sm text-primary hover:underline">← Inicio</Link>
      <PageHeader title="Mi estado de cuenta" description="Cuotas pendientes, vencidas y pagadas." />
      {loading && <p className="text-neutral">Cargando cuotas…</p>}
      {error && (
        <AlertBanner variant="error">
          {error}
          <button
            type="button"
            className="ml-2 text-sm underline"
            onClick={() => void refetch()}
          >
            Reintentar
          </button>
        </AlertBanner>
      )}
      {!loading && !error && data && data.cuotas.length === 0 && (
        <EmptyState title="No tienes cuotas registradas." />
      )}
      {!loading && !error && data && data.cuotas.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-neutral">Total pendiente</p>
              <p className="text-xl font-semibold text-warning tabular-nums">
                {formatMxn(data.totalPendiente)}
              </p>
            </div>
            <div className="rounded border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-neutral">Total vencido</p>
              <p className="text-xl font-semibold text-danger tabular-nums">
                {formatMxn(data.totalVencido)}
              </p>
            </div>
          </div>
          <CuotasTable cuotas={data.cuotas} />
        </>
      )}
    </main>
  )
}
