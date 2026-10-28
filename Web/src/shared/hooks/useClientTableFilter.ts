import { useMemo, useState } from 'react'
import { createEmptyColumnFilters, filterClientTableRows } from '../lib/clientTableFilter'
import type { TableFilterAccessors, TableFilterColumn } from '../types/tableFilter'

export function useClientTableFilter<T>(
  rows: T[],
  columns: TableFilterColumn[],
  accessors: TableFilterAccessors<T>,
) {
  const [globalSearch, setGlobalSearch] = useState('')
  const [columnFilters, setColumnFilters] = useState(() => createEmptyColumnFilters(columns))

  const filteredRows = useMemo(
    () => filterClientTableRows(rows, globalSearch, columnFilters, columns, accessors),
    [rows, globalSearch, columnFilters, columns, accessors],
  )

  const onColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setGlobalSearch('')
    setColumnFilters(createEmptyColumnFilters(columns))
  }

  return {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    resetFilters,
    filteredCount: filteredRows.length,
    totalCount: rows.length,
  }
}
