import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { StatusBadge } from '@/components/StatusBadge';
import { useReconciliation } from '@/features/reconciliations/api';

export function ReconciliationDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, error } = useReconciliation(id);

  if (isPending) return <p className="text-sm text-muted-foreground">Cargando conciliación…</p>;
  if (error || !data) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <section className="flex flex-col gap-3">
        <p role="alert" className="text-destructive">
          {notFound ? 'Conciliación no encontrada.' : 'No se pudo cargar la conciliación.'}
        </p>
        <Link to="/reconciliations" className="text-sm underline">
          Volver al listado
        </Link>
      </section>
    );
  }

  const { config } = data;
  const rows: [string, string][] = [
    ['Ventana de días', String(config.dateWindowDays)],
    ['Tolerancia de monto', String(config.amountTolerance)],
    ['% comisión', String(config.feePercent)],
    ['% retención', String(config.withholdingPercent)],
    ['Cruce agrupado', config.enableGrouping ? 'Sí' : 'No'],
  ];

  return (
    <section className="flex flex-col gap-6">
      <Link to="/reconciliations" className="text-sm underline">
        ← Conciliaciones
      </Link>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">
            Período {data.periodStart} – {data.periodEnd}
          </p>
        </div>
        <StatusBadge status={data.status} />
      </header>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium">Parámetros del cruce</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium">Archivos</h2>
        {data.files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no se han cargado archivos.</p>
        ) : (
          <ul className="text-sm">
            {data.files.map((file) => (
              <li key={file.id}>
                {file.sourceType === 'POS' ? 'POS' : 'Banco'} · {file.originalName} ·{' '}
                {file.totalRows} filas
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
