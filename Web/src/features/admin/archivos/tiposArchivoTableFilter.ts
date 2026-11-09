import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { TipoArchivoItem } from '../../../shared/types/archivos'

export const TIPOS_ARCHIVO_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'tipoArchivo', header: 'Nombre', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const TIPOS_ARCHIVO_TABLE_ACCESSORS = {
  getRowSearchText: (t: TipoArchivoItem) => t.tipoArchivo,
  getColumnValue: (t: TipoArchivoItem, columnKey: string) => {
    if (columnKey === 'tipoArchivo') return t.tipoArchivo
    return ''
  },
}
