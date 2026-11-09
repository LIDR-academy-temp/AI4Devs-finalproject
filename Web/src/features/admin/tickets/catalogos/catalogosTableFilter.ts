import type { TableFilterColumn } from '../../../../shared/types/tableFilter'
import type { CatalogoItem, PrioridadCatalogoItem } from '../../../../shared/types/tickets'

export const CATEGORIAS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'nombre', header: 'Nombre', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const CATEGORIAS_TABLE_ACCESSORS = {
  getRowSearchText: (c: CatalogoItem) => c.nombre,
  getColumnValue: (c: CatalogoItem, columnKey: string) => {
    if (columnKey === 'nombre') return c.nombre
    return ''
  },
}

export const PRIORIDADES_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'nombre', header: 'Nombre', filterType: 'text' },
  { key: 'orden', header: 'Orden', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const PRIORIDADES_TABLE_ACCESSORS = {
  getRowSearchText: (p: PrioridadCatalogoItem) => [p.nombre, p.orden ?? ''].filter(Boolean).join(' '),
  getColumnValue: (p: PrioridadCatalogoItem, columnKey: string) => {
    if (columnKey === 'nombre') return p.nombre
    if (columnKey === 'orden') return p.orden != null ? String(p.orden) : ''
    return ''
  },
}
