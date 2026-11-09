import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { MascotaListItem } from '../../../shared/types/mascotas'

export const MASCOTAS_PADRON_COLUMNS: TableFilterColumn[] = [
  { key: 'nombre', header: 'Mascota', filterType: 'text' },
  { key: 'tipo', header: 'Tipo / raza', filterType: 'text' },
  { key: 'residente', header: 'Residente', filterType: 'text' },
  { key: 'casa', header: 'Casa', filterType: 'text' },
  { key: 'vacunas', header: 'Vacunas', filterType: 'select', selectOptions: [
    { value: 'al día', label: 'Al día' },
    { value: 'pendiente', label: 'Pendiente' },
  ] },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const MASCOTAS_PADRON_ACCESSORS = {
  getRowSearchText: (m: MascotaListItem) =>
    [
      m.nombreMascota,
      m.tipoMascota,
      m.razaMascota,
      m.razaLibre,
      m.nombreUsuario,
      m.correoUsuario,
      m.numeroCasa,
    ]
      .filter(Boolean)
      .join(' '),
  getColumnValue: (m: MascotaListItem, columnKey: string) => {
    switch (columnKey) {
      case 'nombre':
        return m.nombreMascota
      case 'tipo':
        return [m.tipoMascota, m.razaMascota ?? m.razaLibre].filter(Boolean).join(' · ') || '—'
      case 'residente':
        return [m.nombreUsuario, m.correoUsuario].filter(Boolean).join(' ')
      case 'casa':
        return m.numeroCasa ?? '—'
      case 'vacunas':
        if (m.vacunasAlDia === undefined) return '—'
        return m.vacunasAlDia ? 'al día' : 'pendiente'
      default:
        return ''
    }
  },
}
