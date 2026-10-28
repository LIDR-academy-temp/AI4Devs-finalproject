import type { ArchivoListItem } from '../../shared/types/archivos'

/** Filas REST ARC: camelCase (contrato) o PascalCase (API sin reiniciar). */
export type ArchivoListItemApiRow = ArchivoListItem & {
  ArchivoId?: number
  Nombre?: string
  Ruta?: string
  TipoArchivoId?: number | null
  TipoArchivo?: string
  EsPrivado?: boolean
  FechaCreacion?: string
}

export function normalizeArchivoListItem(row: ArchivoListItemApiRow): ArchivoListItem {
  return {
    archivoId: row.archivoId ?? row.ArchivoId ?? 0,
    nombre: row.nombre ?? row.Nombre ?? '',
    ruta: row.ruta ?? row.Ruta ?? '',
    tipoArchivoId: row.tipoArchivoId ?? row.TipoArchivoId ?? null,
    tipoArchivo: row.tipoArchivo ?? row.TipoArchivo ?? '',
    esPrivado: row.esPrivado ?? row.EsPrivado ?? false,
    fechaCreacion: row.fechaCreacion ?? row.FechaCreacion ?? '',
  }
}

export function formatArchivoFecha(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-MX')
}
