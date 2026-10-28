import type { JuntaDetalle, JuntaListItem } from '../../shared/types/juntas'

export type JuntaListApiRow = JuntaListItem & {
  JuntaId?: number
  Titulo?: string
  Descripcion?: string | null
  FechaProgramada?: string
  Ubicacion?: string | null
  Activa?: boolean
  FechaCreacion?: string
}

export function normalizeJuntaListItem(row: JuntaListApiRow): JuntaListItem {
  return {
    juntaId: row.juntaId ?? row.JuntaId ?? 0,
    titulo: row.titulo ?? row.Titulo ?? '',
    descripcion: row.descripcion ?? row.Descripcion ?? null,
    fechaProgramada: row.fechaProgramada ?? row.FechaProgramada ?? '',
    ubicacion: row.ubicacion ?? row.Ubicacion ?? null,
    activa: row.activa ?? row.Activa ?? false,
    fechaCreacion: row.fechaCreacion ?? row.FechaCreacion ?? '',
  }
}

export type JuntaDetalleApiRow = JuntaDetalle & JuntaListApiRow & {
  JuntaDetalleId?: number | null
  Contenido?: string | null
  FechaRegistroDetalle?: string | null
  Archivos?: JuntaDetalle['archivos']
}

export function normalizeJuntaDetalle(row: JuntaDetalleApiRow): JuntaDetalle {
  const base = normalizeJuntaListItem(row)
  const archivos = row.archivos ?? row.Archivos ?? []
  return {
    ...base,
    juntaDetalleId: row.juntaDetalleId ?? row.JuntaDetalleId ?? null,
    contenido: row.contenido ?? row.Contenido ?? null,
    fechaRegistroDetalle: row.fechaRegistroDetalle ?? row.FechaRegistroDetalle ?? null,
    archivos: archivos.map((a) => ({
      juntaDetalleArchivoId:
        a.juntaDetalleArchivoId ??
        (a as { JuntaDetalleArchivoId?: number }).JuntaDetalleArchivoId ??
        0,
      nombreArchivo: a.nombreArchivo ?? (a as { NombreArchivo?: string }).NombreArchivo ?? '',
      ruta: a.ruta ?? (a as { Ruta?: string }).Ruta ?? '',
      tipoArchivo: a.tipoArchivo ?? (a as { TipoArchivo?: string | null }).TipoArchivo ?? null,
    })),
  }
}
