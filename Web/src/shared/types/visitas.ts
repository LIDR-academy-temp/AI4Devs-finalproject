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

export interface TipoIdentificacionDto {
  tipoIdentificacionId: number
  tipoIdentificacion: string
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
  areaComun: string
  fechaInicio: string
  fechaFin: string
  estado: string
  fechaCreacion: string
}

export interface CrearReservacionRequest {
  areaComunId: number
  fechaInicio: string
  fechaFin: string
}

export interface ReservacionCalendarioEvento {
  reservacionAreaId: number
  areaComunId: number
  fechaInicio: string
  fechaFin: string
  estado: string
  etiqueta: string
}

export interface ReservacionAdminItem {
  reservacionAreaId: number
  areaComunId: number
  areaComun: string
  usuarioId: number
  usuarioNombre: string
  usuarioCorreo: string
  fechaInicio: string
  fechaFin: string
  estado: string
}

export type PaginaReservacionesAdmin = {
  total: number
  pagina: number
  items: ReservacionAdminItem[]
}
