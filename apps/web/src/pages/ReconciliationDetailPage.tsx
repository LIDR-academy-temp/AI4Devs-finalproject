import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { StatusBadge } from '@/components/StatusBadge';
import { useReconciliation } from '@/features/reconciliations/api';
import { ResultsPanel } from '@/features/results/ResultsPanel';
import { RunPanel } from '@/features/reconciliations/RunPanel';
import { StoreMappingsCard } from '@/features/reconciliations/StoreMappingsCard';

const FILE_STATUS_LABELS: Record<string, string> = {
  UPLOADED: 'Subido',
  MAPPED: 'Mapeado',
  IMPORTED: 'Importado',
  FAILED: 'Con errores',
};

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
  const editable = ['DRAFT', 'COMPLETED', 'FAILED'].includes(data.status);
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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium">Archivos</h2>
          {editable && (
            <div className="flex gap-2 text-sm">
              <Link
                to={`/reconciliations/${data.id}/import/pos`}
                className="rounded-md border px-3 py-1"
              >
                Cargar POS
              </Link>
              <Link
                to={`/reconciliations/${data.id}/import/bank`}
                className="rounded-md border px-3 py-1"
              >
                Cargar extracto
              </Link>
            </div>
          )}
        </div>
        {data.files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no se han cargado archivos.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {data.files.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-4">
                <span>
                  {file.sourceType === 'POS' ? 'POS' : 'Banco'} · {file.originalName} ·{' '}
                  {FILE_STATUS_LABELS[file.status] ?? file.status} · {file.validRows} de{' '}
                  {file.totalRows} filas
                  {file.errorRows > 0 && ` (${file.errorRows} rechazadas)`}
                </span>
                {editable && (
                  <Link
                    to={`/reconciliations/${data.id}/import/${file.sourceType === 'POS' ? 'pos' : 'bank'}?fileId=${file.id}`}
                    className="underline"
                  >
                    {file.status === 'UPLOADED' ? 'Mapear e importar' : 'Reimportar'}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <StoreMappingsCard />
      <RunPanel reconciliation={data} />
      {data.files.length > 0 && data.status !== 'PROCESSING' && (
        <ResultsPanel
          reconciliationId={data.id}
          version={`${data.status}:${String((data.stats as { lastRunAt?: string } | null)?.lastRunAt ?? '')}`}
          readOnly={data.status === 'CLOSED'}
          tolerance={data.config.amountTolerance}
        />
      )}
    </section>
  );
}
