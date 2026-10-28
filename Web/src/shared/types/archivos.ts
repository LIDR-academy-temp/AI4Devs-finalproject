export interface ArchivoListItem {
  archivoId: number
  nombre: string
  ruta: string
  tipoArchivoId: number | null
  tipoArchivo: string
  esPrivado: boolean
  fechaCreacion: string
}

export interface TipoArchivoItem {
  tipoArchivoId: number
  tipoArchivo: string
}
