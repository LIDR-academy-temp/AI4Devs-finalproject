export interface VisitaListItem {
  visitaId: number
  visitanteNombre: string
  casaId?: number
  numeroCasa?: string
  tipoIdentificacion: string
  numeroIdentificacion: string
  fechaEntrada: string
  fechaSalida?: string
  autorizado: boolean
}

export interface AreaComun {
  areaComunId: number
  nombre: string
  descripcion?: string
  capacidad?: number
  requiereReservacion: boolean
}

export interface ReservacionArea {
  reservacionAreaId: number
  areaComunId: number
  areaComun?: string
  fechaInicio: string
  fechaFin: string
  estado: string
  fechaCreacion: string
}

export interface RegistrarVisitaRequest {
  visitanteNombre: string
  usuarioVisitadoId?: number
  casaId?: number
  tipoIdentificacion: string
  numeroIdentificacion: string
}

export interface CrearReservacionRequest {
  areaComunId: number
  fechaInicio: string
  fechaFin: string
}
