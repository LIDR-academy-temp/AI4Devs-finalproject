import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import {
  STATUS_LABELS,
  useReconciliations,
  type ListFilters,
  type ReconciliationStatus,
} from '@/features/reconciliations/api';

const PAGE_SIZE = 20;
const inputClass = 'rounded-md border bg-background px-3 py-1.5 text-sm font-normal';

const formatDate = (iso: string) => iso.slice(0, 10);

export function ReconciliationsPage() {
  const [filters, setFilters] = useState<ListFilters>({ page: 1, pageSize: PAGE_SIZE });
  const { data, isPending, isError, isFetching } = useReconciliations(filters);

  const update = (change: Partial<ListFilters>) =>
    setFilters((current) => ({ ...current, ...change, page: 1 }));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Conciliaciones</h1>
        <Link
          to="/reconciliations/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Nueva conciliación
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Estado
          <select
            className={inputClass}
            value={filters.status ?? ''}
            onChange={(e) => update({ status: e.target.value as ReconciliationStatus | '' })}
          >
            <option value="">Todos</option>
            {(Object.keys(STATUS_LABELS) as ReconciliationStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Período desde
          <input
            type="date"
            className={inputClass}
            value={filters.from ?? ''}
            onChange={(e) => update({ from: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Período hasta
          <input
            type="date"
            className={inputClass}
            value={filters.to ?? ''}
            onChange={(e) => update({ to: e.target.value })}
          />
        </label>
      </div>

      {isPending && <p className="text-sm text-muted-foreground">Cargando conciliaciones…</p>}
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          No se pudieron cargar las conciliaciones.
        </p>
      )}
      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay conciliaciones que mostrar.</p>
      )}
      {data && data.items.length > 0 && (
        <div className={isFetching ? 'opacity-70' : undefined}>
          <table className="w-full text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Nombre</th>
                <th className="py-2 pr-4 font-medium">Período</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 text-right font-medium">% conciliado</th>
                <th className="py-2 font-medium">Creada</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 pr-4">
                    <Link to={`/reconciliations/${item.id}`} className="font-medium underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    {item.periodStart} – {item.periodEnd}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {item.matchedPercent === null ? '—' : `${item.matchedPercent.toFixed(1)} %`}
                  </td>
                  <td className="py-2">{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginación">
            <span className="text-muted-foreground">
              Página {data.page} de {totalPages} · {data.total} conciliaciones
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 disabled:opacity-50"
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 disabled:opacity-50"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Siguiente
              </button>
            </div>
          </nav>
        </div>
      )}
    </section>
  );
}
