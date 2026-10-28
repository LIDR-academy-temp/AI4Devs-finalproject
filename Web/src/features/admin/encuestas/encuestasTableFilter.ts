import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { EncuestaListItem } from '../../../shared/types/encuestas'

export const ENCUESTAS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'titulo', header: 'Título', filterType: 'text' },
  { key: 'inicio', header: 'Inicio', filterType: 'text' },
  { key: 'fin', header: 'Fin', filterType: 'text' },
  {
    key: 'estado',
    header: 'Estado',
    filterType: 'select',
    selectOptions: [
      { value: 'activa', label: 'Activa' },
      { value: 'borrador', label: 'Borrador' },
    ],
  },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

function formatDate(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX')
}

export const ENCUESTAS_TABLE_ACCESSORS = {
  getRowSearchText: (e: EncuestaListItem) =>
    [e.titulo, e.descripcion, formatDate(e.fechaInicio), formatDate(e.fechaFin), e.activa ? 'activa' : 'borrador']
      .filter(Boolean)
      .join(' '),
  getColumnValue: (e: EncuestaListItem, columnKey: string) => {
    switch (columnKey) {
      case 'titulo':
        return e.titulo
      case 'inicio':
        return formatDate(e.fechaInicio)
      case 'fin':
        return formatDate(e.fechaFin)
      case 'estado':
        return e.activa ? 'activa' : 'borrador'
      default:
        return ''
    }
  },
}
