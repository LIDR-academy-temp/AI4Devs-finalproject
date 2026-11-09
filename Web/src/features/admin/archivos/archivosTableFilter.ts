import { formatArchivoFecha } from '../../../features/archivos/archivoMappers'
import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { ArchivoListItem } from '../../../shared/types/archivos'

export const ARCHIVOS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'nombre', header: 'Nombre', filterType: 'text' },
  { key: 'tipo', header: 'Tipo', filterType: 'text' },
  {
    key: 'privado',
    header: 'Privado',
    filterType: 'select',
    selectOptions: [
      { value: 'si', label: 'Sí' },
      { value: 'no', label: 'No' },
    ],
  },
  { key: 'fecha', header: 'Fecha', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const ARCHIVOS_TABLE_ACCESSORS = {
  getRowSearchText: (a: ArchivoListItem) =>
    [a.nombre, a.tipoArchivo, a.esPrivado ? 'privado' : 'publico', formatArchivoFecha(a.fechaCreacion)].join(' '),
  getColumnValue: (a: ArchivoListItem, columnKey: string) => {
    switch (columnKey) {
      case 'nombre':
        return a.nombre
      case 'tipo':
        return a.tipoArchivo
      case 'privado':
        return a.esPrivado ? 'si' : 'no'
      case 'fecha':
        return formatArchivoFecha(a.fechaCreacion)
      default:
        return ''
    }
  },
}
