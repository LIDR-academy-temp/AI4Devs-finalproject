import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { AnuncioItem } from '../../../shared/types/anuncios'

export const ANUNCIOS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'titulo', header: 'Título', filterType: 'text' },
  { key: 'tipo', header: 'Tipo', filterType: 'text' },
  { key: 'publicacion', header: 'Publicación', filterType: 'text' },
  { key: 'vigencia', header: 'Vigencia', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX')
}

export const ANUNCIOS_TABLE_ACCESSORS = {
  getRowSearchText: (a: AnuncioItem) =>
    [a.titulo, a.contenido, a.tipoAnuncio, formatDate(a.fechaPublicacion), formatDate(a.vigenteHasta)]
      .filter(Boolean)
      .join(' '),
  getColumnValue: (a: AnuncioItem, columnKey: string) => {
    switch (columnKey) {
      case 'titulo':
        return a.titulo
      case 'tipo':
        return a.tipoAnuncio ?? ''
      case 'publicacion':
        return formatDate(a.fechaPublicacion)
      case 'vigencia':
        return formatDate(a.vigenteHasta)
      default:
        return ''
    }
  },
}
