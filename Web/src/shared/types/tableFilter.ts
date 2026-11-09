export type TableFilterType = 'text' | 'select' | 'none'

export type TableFilterColumn = {
  key: string
  header: string
  filterType: TableFilterType
  selectOptions?: { value: string; label: string }[]
  ariaLabel?: string
}

export type TableFilterAccessors<T> = {
  /** Texto completo de la fila para búsqueda global */
  getRowSearchText: (row: T) => string
  /** Valor comparable para filtro de columna (texto o select) */
  getColumnValue: (row: T, columnKey: string) => string
}
