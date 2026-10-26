import type { ImportResult } from './api';
import { errorsToCsv } from './mapping';

export function ImportSummary({
  result,
  allErrors,
}: {
  result: ImportResult;
  /** Todos los errores guardados (la respuesta solo trae los 50 primeros). */
  allErrors?: ImportResult['errors'];
}) {
  const errors = allErrors && allErrors.length > 0 ? allErrors : result.errors;

  function download() {
    const url = URL.createObjectURL(
      new Blob([errorsToCsv(errors)], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'errores-importacion.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const stats: [string, number][] = [
    ['Filas totales', result.totalRows],
    ['Importadas', result.validRows],
    ['Rechazadas', result.errorRows],
    ['Débitos descartados', result.discardedDebits],
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className={result.status === 'FAILED' ? 'font-medium text-destructive' : 'font-medium'}>
        {result.status === 'FAILED'
          ? 'No se importó ninguna fila: revisa el mapeo y los formatos.'
          : 'Importación completada.'}
      </p>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold">{value.toLocaleString('es')}</dd>
          </div>
        ))}
      </dl>

      {result.errorRows > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Filas rechazadas</h2>
            <button
              type="button"
              onClick={download}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Descargar errores (CSV)
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-1 pr-4 font-medium">Fila</th>
                <th className="py-1 pr-4 font-medium">Campo</th>
                <th className="py-1 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.map((error, index) => (
                <tr key={index} className="border-b">
                  <td className="py-1 pr-4">{error.row}</td>
                  <td className="py-1 pr-4">{error.field}</td>
                  <td className="py-1">{error.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.errorRows > result.errors.length && (
            <p className="text-xs text-muted-foreground">
              Se muestran los primeros {result.errors.length} errores; el CSV incluye todos los
              guardados.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
