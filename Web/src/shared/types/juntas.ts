export interface JuntaListItem {
  juntaId: number
  titulo: string
  descripcion: string | null
  fechaProgramada: string
  ubicacion: string | null
  activa: boolean
  fechaCreacion: string
}

export interface JuntaArchivo {
  juntaDetalleArchivoId: number
  nombreArchivo: string
  ruta: string
  tipoArchivo: string | null
}

export interface JuntaDetalle extends JuntaListItem {
  juntaDetalleId: number | null
  contenido: string | null
  fechaRegistroDetalle: string | null
  archivos: JuntaArchivo[]
}

export interface JuntaCrearRequest {
  titulo: string
  descripcion?: string
  fechaProgramada: string
  ubicacion?: string
  contenido?: string
}

export interface JuntaActualizarRequest {
  titulo?: string
  descripcion?: string
  fechaProgramada?: string
  ubicacion?: string
  activa?: boolean
  contenido?: string
}
