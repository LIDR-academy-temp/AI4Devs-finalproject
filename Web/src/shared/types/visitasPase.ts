export type PaseVisitaEstadoLista = 'vigente' | 'expirado' | 'usado' | 'pendiente'

export type PaseVisita = {
  visitaGeneradaId: number
  nombreVisitante: string
  codigoQr: string
  fechaEmision: string
  fechaExpira: string | null
  bUsado: boolean
  unaOcasion?: boolean
  estadoLista: PaseVisitaEstadoLista
  casaId?: number | null
  direccionCasa?: string | null
  tipoIdentificacion?: string | null
  numeroIdentificacion?: string | null
  usuarioVisitadoId?: number
  nombreVisitado?: string | null
}

export type CrearPaseRequest = {
  nombreVisitante: string
  tipoIdentificacionId?: number | null
  numeroIdentificacion?: string | null
  fechaInicio: string
  fechaFin: string
  todoElDia: boolean
  unaOcasion: boolean
}

export type CrearPaseAdminRequest = CrearPaseRequest & {
  usuarioVisitadoId: number
  casaId?: number | null
}

export type ValidarPaseResponse = {
  estado: 'Valido' | 'Expirado' | 'Usado' | 'NoEncontrado' | string
  detalle?: string | null
  pase?: PaseVisita | null
}

export type UsarPaseResponse = {
  ok: boolean
  yaUsado: boolean
  pase?: PaseVisita | null
  visitaId?: number | null
}
