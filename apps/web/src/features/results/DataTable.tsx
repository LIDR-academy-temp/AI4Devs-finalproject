import { Fragment, useState, type ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface Props<T extends { id: string }> {
  label: string;
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  loading?: boolean;
  empty?: string;
  /** Contenido del detalle expandible de una fila. */
  detail?: (row: T) => ReactNode;
  /** Selección múltiple (cruce manual). */
  selected?: ReadonlySet<string>;
  onToggle?: (row: T) => void;
  /** Acciones al final de la fila. */
  actions?: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  label,
  columns,
  rows,
  total,
  page,
  pageSize,
  onPage,
  loading,
  empty = 'No hay elementos',
  detail,
  selected,
  onToggle,
  actions,
}: Props<T>) {
  const [open, setOpen] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const colSpan = columns.length + (detail ? 1 : 0) + (onToggle ? 1 : 0) + (actions ? 1 : 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border">
        <table aria-label={label} className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              {onToggle && <th className="w-8 px-2 py-2" />}
              {columns.map((c) => (
                <th key={c.header} className="px-2 py-2 font-medium">
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-2 py-2" />}
              {detail && <th className="w-8 px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-2 py-6 text-center text-muted-foreground">
                  {loading ? 'Cargando…' : empty}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr className="border-t">
                  {onToggle && (
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar fila ${row.id}`}
                        checked={selected?.has(row.id) ?? false}
                        onChange={() => onToggle(row)}
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.header} className={`px-2 py-1 ${c.className ?? ''}`}>
                      {c.render(row)}
                    </td>
                  ))}
                  {actions && <td className="px-2 py-1 text-right">{actions(row)}</td>}
                  {detail && (
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        aria-expanded={open === row.id}
                        aria-label="Ver detalle"
                        onClick={() => setOpen(open === row.id ? null : row.id)}
                        className="text-xs underline"
                      >
                        {open === row.id ? 'Ocultar' : 'Detalle'}
                      </button>
                    </td>
                  )}
                </tr>
                {detail && open === row.id && (
                  <tr className="border-t bg-muted/40">
                    <td colSpan={colSpan} className="px-3 py-2">
                      {detail(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total} {total === 1 ? 'elemento' : 'elementos'} · página {page} de {pages}
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="rounded-md border px-2 py-1 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
            className="rounded-md border px-2 py-1 disabled:opacity-50"
          >
            Siguiente
          </button>
        </span>
      </div>
    </div>
  );
}
