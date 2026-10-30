import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { ReservacionAdminItem } from '../../../shared/types/visitas'

export const RESERVACIONES_ADMIN_COLUMNS: TableFilterColumn[] = [
  { key: 'area', header: 'Área', filterType: 'text' },
  { key: 'residente', header: 'Residente', filterType: 'text' },
  { key: 'inicio', header: 'Inicio', filterType: 'text' },
  { key: 'fin', header: 'Fin', filterType: 'text' },
  {
    key: 'estado',
    header: 'Estado',
    filterType: 'select',
    selectOptions: [
      { value: 'Pendiente', label: 'Pendiente' },
      { value: 'Confirmada', label: 'Confirmada' },
      { value: 'Cancelada', label: 'Cancelada' },
    ],
  },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const RESERVACIONES_ADMIN_ACCESSORS = {
  getRowSearchText: (r: ReservacionAdminItem) =>
    [r.areaComun, r.usuarioNombre, r.usuarioCorreo, r.estado].filter(Boolean).join(' '),
  getColumnValue: (r: ReservacionAdminItem, columnKey: string) => {
    switch (columnKey) {
      case 'area':
        return r.areaComun
      case 'residente':
        return [r.usuarioNombre, r.usuarioCorreo].filter(Boolean).join(' ')
      case 'inicio':
        return new Date(r.fechaInicio).toLocaleString('es-MX')
      case 'fin':
        return new Date(r.fechaFin).toLocaleString('es-MX')
      case 'estado':
        return r.estado
      default:
        return ''
    }
  },
}
