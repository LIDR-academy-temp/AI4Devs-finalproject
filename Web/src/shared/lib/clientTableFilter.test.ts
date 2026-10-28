import { describe, expect, it } from 'vitest'
import { createEmptyColumnFilters, filterClientTableRows } from './clientTableFilter'
import type { TableFilterColumn } from '../types/tableFilter'

type Row = { id: number; name: string; city: string }

const columns: TableFilterColumn[] = [
  { key: 'name', header: 'Nombre', filterType: 'text' },
  { key: 'city', header: 'Ciudad', filterType: 'text' },
  { key: 'actions', header: 'Acciones', filterType: 'none' },
]

const rows: Row[] = [
  { id: 1, name: 'Ana', city: 'CDMX' },
  { id: 2, name: 'Luis', city: 'GDL' },
]

const accessors = {
  getRowSearchText: (r: Row) => `${r.name} ${r.city}`,
  getColumnValue: (r: Row, key: string) => (key === 'name' ? r.name : key === 'city' ? r.city : ''),
}

describe('clientTableFilter', () => {
  it('createEmptyColumnFilters omite columnas none', () => {
    expect(createEmptyColumnFilters(columns)).toEqual({ name: '', city: '' })
  })

  it('filtra por columna y búsqueda global', () => {
    const byCity = filterClientTableRows(
      rows,
      '',
      { name: '', city: 'cdmx' },
      columns,
      accessors,
    )
    expect(byCity).toHaveLength(1)
    expect(byCity[0].name).toBe('Ana')

    const byGlobal = filterClientTableRows(rows, 'luis', {}, columns, accessors)
    expect(byGlobal).toHaveLength(1)
  })
})
