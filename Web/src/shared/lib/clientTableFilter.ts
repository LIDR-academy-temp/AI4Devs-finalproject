import type { TableFilterAccessors, TableFilterColumn } from '../types/tableFilter'

export function createEmptyColumnFilters(columns: TableFilterColumn[]): Record<string, string> {
  return Object.fromEntries(
    columns.filter((c) => c.filterType !== 'none').map((c) => [c.key, '']),
  )
}

/**
 * Filtrado cliente genérico (paridad Web_diseño cq-table-filter.js).
 * La página define columnas + accessors; la UI vive en AdminFilterableTable.
 */
export function filterClientTableRows<T>(
  rows: T[],
  globalSearch: string,
  columnFilters: Record<string, string>,
  columns: TableFilterColumn[],
  accessors: TableFilterAccessors<T>,
): T[] {
  const global = globalSearch.trim().toLowerCase()
  const filterableColumns = columns.filter((c) => c.filterType !== 'none')

  return rows.filter((row) => {
    if (global) {
      const haystack = accessors.getRowSearchText(row).toLowerCase()
      if (!haystack.includes(global)) return false
    }

    for (const col of filterableColumns) {
      const raw = columnFilters[col.key]?.trim() ?? ''
      if (!raw) continue

      const cell = accessors.getColumnValue(row, col.key).toLowerCase()
      const needle = raw.toLowerCase()

      if (col.filterType === 'select') {
        if (cell !== needle && !cell.includes(needle)) return false
      } else if (!cell.includes(needle)) {
        return false
      }
    }

    return true
  })
}
