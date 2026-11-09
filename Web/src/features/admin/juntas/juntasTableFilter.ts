import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { JuntaListItem } from '../../../shared/types/juntas'

export const JUNTAS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'titulo', header: 'Título', filterType: 'text' },
  { key: 'fecha', header: 'Fecha', filterType: 'text' },
  { key: 'ubicacion', header: 'Ubicación', filterType: 'text' },
  {
    key: 'estado',
    header: 'Estado',
    filterType: 'select',
    selectOptions: [
      { value: 'activa', label: 'Activa' },
      { value: 'cerrada', label: 'Cerrada' },
    ],
  },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

export const JUNTAS_TABLE_ACCESSORS = {
  getRowSearchText: (j: JuntaListItem) =>
    [j.titulo, j.descripcion, j.ubicacion, j.activa ? 'activa' : 'cerrada', formatFecha(j.fechaProgramada)]
      .filter(Boolean)
      .join(' '),
  getColumnValue: (j: JuntaListItem, columnKey: string) => {
    switch (columnKey) {
      case 'titulo':
        return j.titulo
      case 'fecha':
        return formatFecha(j.fechaProgramada)
      case 'ubicacion':
        return j.ubicacion ?? ''
      case 'estado':
        return j.activa ? 'activa' : 'cerrada'
      default:
        return ''
    }
  },
}
