import { formatFecha, formatMxn, formatPeriodo } from '../../finanzas/format'
import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { CuotaEstado } from '../../../shared/types/finanzas'
import { cuotaMontoTotal } from './cuotaMontoUtils'

export const CUOTAS_ADMIN_COLUMNS: TableFilterColumn[] = [
  { key: 'periodo', header: 'Período', filterType: 'text' },
  { key: 'monto', header: 'Monto', filterType: 'text' },
  { key: 'vencimiento', header: 'Vencimiento', filterType: 'text' },
  {
    key: 'estado',
    header: 'Estado',
    filterType: 'select',
    selectOptions: [
      { value: 'Pendiente', label: 'Pendiente' },
      { value: 'Pagada', label: 'Pagada' },
      { value: 'Vencida', label: 'Vencida' },
    ],
  },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const CUOTAS_ADMIN_ACCESSORS = {
  getRowSearchText: (c: CuotaEstado) =>
    [
      formatPeriodo(c.periodoInicio),
      formatMxn(cuotaMontoTotal(c)),
      formatFecha(c.fechaVencimiento),
      c.estado,
      c.cuenta,
    ]
      .filter(Boolean)
      .join(' '),
  getColumnValue: (c: CuotaEstado, columnKey: string) => {
    switch (columnKey) {
      case 'periodo':
        return formatPeriodo(c.periodoInicio)
      case 'monto':
        return String(cuotaMontoTotal(c))
      case 'vencimiento':
        return formatFecha(c.fechaVencimiento)
      case 'estado':
        return c.estado
      default:
        return ''
    }
  },
}
