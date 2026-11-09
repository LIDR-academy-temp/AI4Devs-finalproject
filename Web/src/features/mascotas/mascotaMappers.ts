import type { MascotaListItem, RazaMascotaDto, TipoMascotaDto } from '../../shared/types/mascotas'

export type MascotaListItemApiRow = MascotaListItem & {
  MascotaId?: number
  UsuarioId?: number
  NombreUsuario?: string
  CorreoUsuario?: string
  NombreMascota?: string
  TipoMascotaId?: number
  TipoMascota?: string
  RazaMascotaId?: number
  RazaMascota?: string
  RazaLibre?: string
  VacunasAlDia?: boolean
  FechaUltimaVacuna?: string
  FechaNacimiento?: string
  NumeroCasa?: string
}

export function normalizeMascotaListItem(row: MascotaListItemApiRow): MascotaListItem {
  return {
    mascotaId: row.mascotaId ?? row.MascotaId ?? 0,
    usuarioId: row.usuarioId ?? row.UsuarioId ?? 0,
    nombreUsuario: row.nombreUsuario ?? row.NombreUsuario,
    correoUsuario: row.correoUsuario ?? row.CorreoUsuario,
    nombreMascota: (row.nombreMascota ?? row.NombreMascota ?? '').trim(),
    tipoMascotaId: row.tipoMascotaId ?? row.TipoMascotaId,
    tipoMascota: row.tipoMascota ?? row.TipoMascota,
    razaMascotaId: row.razaMascotaId ?? row.RazaMascotaId,
    razaMascota: row.razaMascota ?? row.RazaMascota,
    razaLibre: row.razaLibre ?? row.RazaLibre,
    vacunasAlDia: row.vacunasAlDia ?? row.VacunasAlDia,
    fechaUltimaVacuna: row.fechaUltimaVacuna ?? row.FechaUltimaVacuna,
    fechaNacimiento: row.fechaNacimiento ?? row.FechaNacimiento,
    numeroCasa: row.numeroCasa ?? row.NumeroCasa,
  }
}

export type TipoMascotaApiRow = TipoMascotaDto & { TipoMascotaId?: number; TipoMascota?: string }
export type RazaMascotaApiRow = RazaMascotaDto & {
  RazaMascotaId?: number
  RazaMascota?: string
  TipoMascotaId?: number
}

export function normalizeTipoMascota(row: TipoMascotaApiRow): TipoMascotaDto {
  return {
    tipoMascotaId: row.tipoMascotaId ?? row.TipoMascotaId ?? 0,
    tipoMascota: row.tipoMascota ?? row.TipoMascota ?? '',
  }
}

export function normalizeRazaMascota(row: RazaMascotaApiRow): RazaMascotaDto {
  return {
    razaMascotaId: row.razaMascotaId ?? row.RazaMascotaId ?? 0,
    razaMascota: row.razaMascota ?? row.RazaMascota ?? '',
    tipoMascotaId: row.tipoMascotaId ?? row.TipoMascotaId ?? 0,
  }
}
