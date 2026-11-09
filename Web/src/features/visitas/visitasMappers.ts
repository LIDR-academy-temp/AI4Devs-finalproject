import type { TipoIdentificacionDto, VisitaListItem } from '../../shared/types/visitas'

type VisitaApiRow = {
  visitaId?: number
  VisitaId?: number
  visitanteNombre?: string
  VisitanteNombre?: string
  casaId?: number
  CasaId?: number
  numeroCasa?: string
  NumeroCasa?: string
  tipoIdentificacion?: string
  TipoIdentificacion?: string
  numeroIdentificacion?: string
  NumeroIdentificacion?: string
  fechaEntrada?: string
  FechaEntrada?: string
  fechaSalida?: string
  FechaSalida?: string
  autorizado?: boolean
  Autorizado?: boolean
}

type TipoIdentificacionApiRow = {
  tipoIdentificacionId?: number
  TipoIdentificacionId?: number
  tipoIdentificacion?: string
  TipoIdentificacion?: string
}

export function normalizeVisita(row: VisitaApiRow): VisitaListItem {
  return {
    visitaId: row.visitaId ?? row.VisitaId ?? 0,
    visitanteNombre: row.visitanteNombre ?? row.VisitanteNombre ?? '',
    casaId: row.casaId ?? row.CasaId,
    numeroCasa: row.numeroCasa ?? row.NumeroCasa,
    tipoIdentificacion: row.tipoIdentificacion ?? row.TipoIdentificacion ?? '',
    numeroIdentificacion: row.numeroIdentificacion ?? row.NumeroIdentificacion ?? '',
    fechaEntrada: row.fechaEntrada ?? row.FechaEntrada ?? '',
    fechaSalida: row.fechaSalida ?? row.FechaSalida,
    autorizado: row.autorizado ?? row.Autorizado ?? false,
  }
}

export function normalizeTipoIdentificacion(row: TipoIdentificacionApiRow): TipoIdentificacionDto {
  return {
    tipoIdentificacionId: row.tipoIdentificacionId ?? row.TipoIdentificacionId ?? 0,
    tipoIdentificacion: row.tipoIdentificacion ?? row.TipoIdentificacion ?? '',
  }
}
