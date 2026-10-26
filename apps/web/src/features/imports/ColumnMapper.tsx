import { DATE_FORMATS, type FilePreview } from './api';
import { hasProblems, interpretDate, validateMapping, type ColumnMapping } from './mapping';

export interface MapperSettings {
  headerRow: number;
  dateFormat: string;
  decimalSeparator: '.' | ',';
}

interface Props {
  preview: FilePreview;
  mapping: ColumnMapping;
  settings: MapperSettings;
  onMappingChange: (mapping: ColumnMapping) => void;
  onSettingsChange: (settings: MapperSettings) => void;
  onImport: () => void;
  importing: boolean;
  serverError?: string | null;
}

const inputClass = 'rounded-md border bg-background px-2 py-1 text-sm font-normal';
const DATE_FIELDS = ['transactionAt', 'postedAt', 'valueDate'];

export function ColumnMapper({
  preview,
  mapping,
  settings,
  onMappingChange,
  onSettingsChange,
  onImport,
  importing,
  serverError,
}: Props) {
  const problems = validateMapping(mapping, preview.fields);
  const duplicatedColumns = new Set(problems.duplicated.flatMap((d) => d.columns));

  const dateColumn = Object.entries(mapping).find(([, field]) => DATE_FIELDS.includes(field))?.[0];
  const sample = dateColumn === undefined ? undefined : preview.rows[0]?.cells[Number(dateColumn)];
  const interpreted = sample === undefined ? null : interpretDate(sample, settings.dateFormat);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Fila de cabeceras
          <input
            type="number"
            min={1}
            className={`${inputClass} w-24`}
            value={settings.headerRow}
            onChange={(e) =>
              onSettingsChange({ ...settings, headerRow: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Formato de fecha
          <select
            className={inputClass}
            value={settings.dateFormat}
            onChange={(e) => onSettingsChange({ ...settings, dateFormat: e.target.value })}
          >
            {DATE_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Separador decimal
          <select
            className={inputClass}
            value={settings.decimalSeparator}
            onChange={(e) =>
              onSettingsChange({ ...settings, decimalSeparator: e.target.value as '.' | ',' })
            }
          >
            <option value=".">Punto (1234.56)</option>
            <option value=",">Coma (1234,56)</option>
          </select>
        </label>
        {interpreted !== null && (
          <p className="text-sm text-muted-foreground">
            Primera fecha: {String(sample)} → {interpreted}
          </p>
        )}
        {sample !== undefined && interpreted === null && (
          <p role="status" className="text-sm text-destructive">
            La primera fecha ({String(sample)}) no coincide con el formato elegido
          </p>
        )}
      </div>

      {preview.sheetCount > 1 && (
        <p className="text-sm text-muted-foreground">
          El archivo tiene {preview.sheetCount} hojas: se usa la primera ({preview.sheetName}).
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-secondary">
              {preview.headers.map((header, column) => (
                <th key={column} className="min-w-40 p-2 align-top font-medium">
                  <div className="mb-1">{header}</div>
                  <select
                    aria-label={`Campo para la columna ${header}`}
                    className={`${inputClass} w-full ${duplicatedColumns.has(column) ? 'border-destructive' : ''}`}
                    value={mapping[column] ?? ''}
                    onChange={(e) => onMappingChange({ ...mapping, [column]: e.target.value })}
                  >
                    <option value="">Sin asignar</option>
                    {preview.fields.map((f) => (
                      <option key={f.field} value={f.field}>
                        {f.label}
                        {f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr key={row.rowNumber} className="border-b">
                {preview.headers.map((_, column) => (
                  <td key={column} className="max-w-60 truncate p-2">
                    {row.cells[column] === null ? '' : String(row.cells[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Mostrando {preview.rows.length} de {preview.totalRows} filas. Los números de tarjeta se
        enmascaran. * Campo obligatorio.
      </p>

      {problems.missingRequired.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Falta asignar: {problems.missingRequired.map((f) => f.label).join(', ')}
        </p>
      )}
      {problems.duplicated.map(({ field }) => (
        <p key={field.field} role="alert" className="text-sm text-destructive">
          El campo «{field.label}» está asignado a más de una columna
        </p>
      ))}
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onImport}
          disabled={hasProblems(problems) || importing}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {importing ? 'Importando…' : 'Importar'}
        </button>
      </div>
    </div>
  );
}
