import { useState } from 'react';
import { ApiError } from '@/api/client';
import { useRunReconciliation, type ReconciliationDetail, type RunParams } from './api';

const FIELDS: { key: keyof RunParams; label: string; step: string }[] = [
  { key: 'dateWindowDays', label: 'Ventana de días', step: '1' },
  { key: 'amountTolerance', label: 'Tolerancia de monto', step: '0.01' },
  { key: 'feePercent', label: '% comisión', step: '0.01' },
  { key: 'withholdingPercent', label: '% retención', step: '0.01' },
];

interface Stats {
  matchedPercent?: number;
  matchedByMethod?: Record<string, number>;
  pendingPos?: number;
  pendingBank?: number;
  proposed?: number;
  unmappedStores?: string[];
  posWithoutStore?: number;
  bankWithoutStore?: number;
  error?: string;
}

/** Valida los parámetros del diálogo; devuelve el mensaje de error o null. */
export function validateRunParams(values: Record<keyof RunParams, string>): string | null {
  for (const { key, label } of FIELDS) {
    const n = Number(values[key]);
    if (values[key].trim() === '' || Number.isNaN(n) || n < 0) {
      return `${label} debe ser un número mayor o igual a 0`;
    }
  }
  if (!Number.isInteger(Number(values.dateWindowDays)) || Number(values.dateWindowDays) > 30) {
    return 'Ventana de días debe ser un entero entre 0 y 30';
  }
  for (const key of ['amountTolerance', 'feePercent', 'withholdingPercent'] as const) {
    if (Number(values[key]) > 100) return 'Los porcentajes y la tolerancia no pueden superar 100';
  }
  return null;
}

export function RunPanel({ reconciliation }: { reconciliation: ReconciliationDetail }) {
  const { config, status } = reconciliation;
  const run = useRunReconciliation(reconciliation.id);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<keyof RunParams, string>>({
    dateWindowDays: String(config.dateWindowDays),
    amountTolerance: String(config.amountTolerance),
    feePercent: String(config.feePercent),
    withholdingPercent: String(config.withholdingPercent),
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const stats = (reconciliation.stats ?? {}) as Stats;
  const imported = (source: 'POS' | 'BANK') =>
    reconciliation.files.some((f) => f.sourceType === source && f.status === 'IMPORTED');
  const missing = [!imported('POS') && 'POS', !imported('BANK') && 'extracto bancario'].filter(
    Boolean,
  );
  const processing = status === 'PROCESSING' || run.isPending;
  const canRun = status !== 'CLOSED' && missing.length === 0 && !processing;

  function submit() {
    const problem = validateRunParams(values);
    setLocalError(problem);
    if (problem) return;
    run.mutate(
      {
        dateWindowDays: Number(values.dateWindowDays),
        amountTolerance: Number(values.amountTolerance),
        feePercent: Number(values.feePercent),
        withholdingPercent: Number(values.withholdingPercent),
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  const serverError =
    run.error instanceof ApiError
      ? run.error.message
      : run.error
        ? 'No se pudo iniciar la ejecución'
        : null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">Ejecución</h2>
        <button
          type="button"
          disabled={!canRun}
          onClick={() => setOpen(true)}
          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
        >
          {status === 'DRAFT' ? 'Ejecutar' : 'Volver a ejecutar'}
        </button>
      </div>

      {missing.length > 0 && status !== 'CLOSED' && (
        <p className="text-sm text-muted-foreground">Falta importar: {missing.join(' y ')}.</p>
      )}

      {processing && (
        <p role="status" className="text-sm">
          Procesando la conciliación… puede tardar unos segundos.
        </p>
      )}

      {status === 'FAILED' && !processing && (
        <p role="alert" className="text-sm text-destructive">
          La ejecución falló: {stats.error ?? 'error desconocido'}
        </p>
      )}

      {status === 'COMPLETED' && !processing && (
        <ul className="text-sm">
          <li>Cruzadas: {stats.matchedPercent ?? 0} % de las ventas POS</li>
          <li>
            Por método:{' '}
            {Object.entries(stats.matchedByMethod ?? {})
              .map(([method, count]) => `${method} ${count}`)
              .join(', ') || 'ninguno'}
          </li>
          <li>Propuestas por revisar: {stats.proposed ?? 0}</li>
          <li>
            Pendientes: {stats.pendingPos ?? 0} POS y {stats.pendingBank ?? 0} banco
          </li>
          {((stats.posWithoutStore ?? 0) > 0 || (stats.bankWithoutStore ?? 0) > 0) && (
            <li className="text-amber-700">
              Sin local en el archivo: {stats.posWithoutStore ?? 0} ventas POS y{' '}
              {stats.bankWithoutStore ?? 0} movimientos del banco. Reimporta mapeando la columna del
              local para poder cruzar por local, lote y referencia.
            </li>
          )}
          {(stats.unmappedStores?.length ?? 0) > 0 && (
            <li className="text-amber-700">
              Locales sin relación con el banco: {stats.unmappedStores?.join(', ')}
            </li>
          )}
        </ul>
      )}

      {serverError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Parámetros de ejecución"
          className="mt-3 rounded-md border p-3"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FIELDS.map(({ key, label, step }) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                {label}
                <input
                  type="number"
                  step={step}
                  min="0"
                  value={values[key]}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  className="rounded-md border bg-background px-2 py-1"
                />
              </label>
            ))}
          </div>
          {localError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {localError}
            </p>
          )}
          <div className="mt-3 flex gap-2 text-sm">
            <button
              type="button"
              onClick={submit}
              disabled={run.isPending}
              className="rounded-md bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
            >
              Iniciar ejecución
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border px-3 py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
