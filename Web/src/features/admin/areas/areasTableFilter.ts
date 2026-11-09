import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { AreaComun } from '../../../shared/types/visitas'

export const AREAS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'nombre', header: 'Nombre', filterType: 'text' },
  { key: 'capacidad', header: 'Capacidad', filterType: 'text' },
  { key: 'reservable', header: 'Reservable', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const AREAS_TABLE_ACCESSORS = {
  getRowSearchText: (a: AreaComun) =>
    [a.nombre, a.descripcion, a.capacidad, a.requiereReservacion ? 'si' : 'no'].filter(Boolean).join(' '),
  getColumnValue: (a: AreaComun, columnKey: string) => {
    switch (columnKey) {
      case 'nombre':
        return a.nombre
      case 'capacidad':
        return a.capacidad != null ? String(a.capacidad) : '—'
      case 'reservable':
        return a.requiereReservacion ? 'Sí' : 'No'
      default:
        return ''
    }
  },
}
