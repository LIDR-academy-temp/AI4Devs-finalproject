import type { ReactNode } from 'react'
import type { TableFilterColumn } from '../../types/tableFilter'

export type { TableFilterColumn } from '../../types/tableFilter'

export type AdminFilterableTableProps = {
  columns: TableFilterColumn[]
  columnFilters: Record<string, string>
  onColumnFilterChange: (key: string, value: string) => void
  globalSearch: string
  onGlobalSearchChange: (value: string) => void
  filteredCount: number
  totalCount: number
  children: ReactNode
  /** Requiere ancestro `.cq-admin-page` o import de `cq-admin.css` para estilos cq-tf-* */
  tableClassName?: string
  globalSearchPlaceholder?: string
  emptyFilterMessage?: string
  showGlobalSearch?: boolean
}

export function AdminFilterableTable({
  columns,
  columnFilters,
  onColumnFilterChange,
  globalSearch,
  onGlobalSearchChange,
  filteredCount,
  totalCount,
  children,
  tableClassName = 'table table-striped table-hover align-middle cq-filterable',
  globalSearchPlaceholder = 'Buscar en tabla…',
  showGlobalSearch = true,
}: AdminFilterableTableProps) {
  const countLabel =
    filteredCount === totalCount
      ? `${totalCount} registro${totalCount !== 1 ? 's' : ''}`
      : `${filteredCount} de ${totalCount}`

  return (
    <>
      {showGlobalSearch && (
        <div className="cq-tf-toolbar">
          <div className="cq-tf-search-wrap">
            <span className="cq-tf-search-icon" aria-hidden="true">
              <i className="mdi mdi-magnify" />
            </span>
            <input
              type="search"
              className="cq-tf-search"
              placeholder={globalSearchPlaceholder}
              aria-label="Buscar en tabla"
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
            />
            <span
              className={`cq-tf-count${filteredCount !== totalCount ? ' cq-tf-count-filtered' : ''}`}
            >
              {countLabel}
            </span>
          </div>
        </div>
      )}
      <div className="table-responsive cq-admin-table-pane">
        <table className={tableClassName}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col">{col.header}</th>
              ))}
            </tr>
            <tr className="cq-tf-filter-row">
              {columns.map((col) => (
                <th key={`${col.key}-filter`} className="cq-tf-col-cell" scope="col">
                  {col.filterType === 'none' ? null : col.filterType === 'select' ? (
                    <select
                      className="cq-tf-select"
                      aria-label={col.ariaLabel ?? `Filtrar ${col.header}`}
                      value={columnFilters[col.key] ?? ''}
                      onChange={(e) => onColumnFilterChange(col.key, e.target.value)}
                    >
                      <option value="">Todos</option>
                      {(col.selectOptions ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="search"
                      className="cq-tf-input"
                      placeholder="…"
                      aria-label={col.ariaLabel ?? `Filtrar ${col.header}`}
                      value={columnFilters[col.key] ?? ''}
                      onChange={(e) => onColumnFilterChange(col.key, e.target.value)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </>
  )
}
