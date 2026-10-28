import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { AdminTicketItem } from './useTicketsAdmin'

export const TICKETS_ADMIN_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'titulo', header: 'Título', filterType: 'text' },
  { key: 'estado', header: 'Estado', filterType: 'text' },
  { key: 'prioridad', header: 'Prioridad', filterType: 'text' },
  { key: 'categoria', header: 'Categoría', filterType: 'text' },
  { key: 'solicitante', header: 'Solicitante', filterType: 'text' },
  { key: 'fecha', header: 'Creado', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const TICKETS_ADMIN_TABLE_ACCESSORS = {
  getRowSearchText: (t: AdminTicketItem) =>
    [t.titulo, t.estado, t.prioridad, t.categoria, t.solicitante, t.fechaCreacion].filter(Boolean).join(' '),
  getColumnValue: (t: AdminTicketItem, columnKey: string) => {
    switch (columnKey) {
      case 'titulo':
        return t.titulo
      case 'estado':
        return t.estado
      case 'prioridad':
        return t.prioridad
      case 'categoria':
        return t.categoria ?? ''
      case 'solicitante':
        return t.solicitante
      case 'fecha':
        return t.fechaCreacion
      default:
        return ''
    }
  },
}
